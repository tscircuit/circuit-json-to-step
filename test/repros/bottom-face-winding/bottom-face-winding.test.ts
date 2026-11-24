import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib"
import { importStepWithOcct } from "../../utils/occt/importer"
import fixture from "./bottom-face-winding.json"
import { inspectBoardCaps } from "./inspect-board-caps"
import { renderWindingSnapshot } from "./render-winding-snapshot"

// #197, generated with @tscircuit/core@0.0.2464 (tscircuit@0.0.3288):
// export default () => <board width="50mm" height="30mm" />
for (const exportMode of ["pcb", "assembly"] as const) {
  test(`#197: ${exportMode} board bottom boundary opposes its outward normal`, async () => {
    const step = await circuitJsonToStep(fixture as CircuitJson, { exportMode })
    const inspection = inspectBoardCaps(step)
    const [top, bottom] = inspection.caps
    expect(top.normalZ).toBe(1)
    expect(bottom.normalZ).toBe(-1)
    expect(top.signedArea).toBe(1500)
    // Current bug: bottom is also counter-clockwise when viewed from +Z.
    expect(bottom.signedArea).toBe(1500)
    expect(inspection.inconsistentEdges).toBe(4)
    // OCCT imports the defective topology, so an import/screenshot alone cannot guard this.
    expect((await importStepWithOcct(step)).success).toBe(true)
    if (exportMode === "pcb") {
      await expect(renderWindingSnapshot(inspection)).toMatchPngSnapshot(
        import.meta.path,
        "bottom-face-winding",
      )
    }
  })
}
