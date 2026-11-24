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
  test(`#197: ${exportMode} board bottom face is wound around its outward normal`, async () => {
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
    // Bottom runs the opposite way, counter-clockwise seen from its -Z normal.
    expect(bottom.loop.map(({ x, y }) => [x, y])).toEqual([
      [-25, -15],
      [-25, 15],
      [25, 15],
      [25, -15],
    ])

    // Each edge is now walked once in each direction: a closed shell.
    expect(inconsistentEdges).toEqual([])

    // OCCT heals the loop on import, so an OCCT render cannot catch this.
    expect((await importStepWithOcct(step)).success).toBe(true)

    if (exportMode === "pcb") {
      // Faces drawn with the winding written in the STEP, back faces culled.
      // Left, from above; right, from below: both caps now render.
      await expect(
        await renderWoundShell(faces, [
          { camPos: [30, -45, 45], lookAt: [0, 0, 0] },
          { camPos: [30, -45, -45], lookAt: [0, 0, 0] },
        ]),
      ).toMatchPngSnapshot(import.meta.path, "bottom-face-winding")
    }
  })
}

test("#197: concave and edge-notched boards form closed shells", async () => {
  const board = (fixture as CircuitJson).find(
    (item) => item.type === "pcb_board",
  )!
  const concave: CircuitJson = [
    {
      ...board,
      width: 40,
      height: 30,
      center: { x: 20, y: 15 },
      outline: [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 15 },
        { x: 20, y: 15 },
        { x: 20, y: 30 },
        { x: 0, y: 30 },
      ],
    },
  ]
  const notched: CircuitJson = [
    board,
    {
      type: "pcb_cutout",
      pcb_cutout_id: "edge_notch",
      shape: "rect",
      center: { x: 25, y: 0 },
      width: 10,
      height: 10,
      rotation: 0,
    },
  ]
  for (const circuit of [concave, notched]) {
    for (const exportMode of ["pcb", "assembly"] as const) {
      const step = await circuitJsonToStep(circuit, { exportMode })
      expect(readBoardShell(step).inconsistentEdges).toEqual([])
    }
  }
})
