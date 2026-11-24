import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib"
import { importStepWithOcct } from "../../utils/occt/importer"
import fixture from "./bottom-face-winding.json"
import { readBoardShell } from "./read-board-shell"
import { renderWoundShell } from "./render-wound-shell"

// #197, generated with @tscircuit/core@0.0.2464 (tscircuit@0.0.3288):
// export default () => <board width="50mm" height="30mm" />
for (const exportMode of ["pcb", "assembly"] as const) {
  test(`#197: ${exportMode} board bottom face is wound against its normal`, async () => {
    const step = await circuitJsonToStep(fixture as CircuitJson, { exportMode })
    const { faces, inconsistentEdges } = readBoardShell(step)

    const top = faces.find((face) => face.normal === "+Z")!
    const bottom = faces.find((face) => face.normal === "-Z")!
    // Top runs counter-clockwise seen from +Z, matching its +Z normal.
    expect(top.loop.map(({ x, y }) => [x, y])).toEqual([
      [-25, -15],
      [25, -15],
      [25, 15],
      [-25, 15],
    ])
    // Bug: bottom runs the same way, so seen from its own -Z normal it is
    // clockwise. It should run the opposite way to the top loop.
    expect(bottom.loop.map(({ x, y }) => [x, y])).toEqual([
      [-25, -15],
      [25, -15],
      [25, 15],
      [-25, 15],
    ])

    // Consequence: each bottom perimeter edge is walked the same way by the
    // bottom face and its side wall, so a strict reader sees an open shell.
    expect(inconsistentEdges).toEqual([
      ["+X", "-Z"],
      ["+Y", "-Z"],
      ["-X", "-Z"],
      ["-Y", "-Z"],
    ])

    // OCCT heals the loop on import, so an OCCT render cannot catch this.
    expect((await importStepWithOcct(step)).success).toBe(true)

    if (exportMode === "pcb") {
      // Faces drawn with the winding written in the STEP, back faces culled.
      // Left, from above: the top face renders. Right, from below: the
      // bottom face is culled as a back face, so the board is see-through.
      await expect(
        await renderWoundShell(faces, [
          { camPos: [30, -45, 45], lookAt: [0, 0, 0] },
          { camPos: [30, -45, -45], lookAt: [0, 0, 0] },
        ]),
      ).toMatchPngSnapshot(import.meta.path, "bottom-face-winding")
    }
  })
}
