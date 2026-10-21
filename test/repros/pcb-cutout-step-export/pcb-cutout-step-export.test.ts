import { expect, test } from "bun:test"
import type { CircuitJson, PcbCutoutCircle } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import { countCrossings } from "../../utils/occt/count-crossings"
import { importStepWithOcct } from "../../utils/occt/importer"
import "../../fixtures/step-snapshot"
import circuitJsonFixture from "./pcb-cutout-step-export.json"

// The JSON import widens `type` to string, so narrow it to the schema once here
// rather than casting at every use site.
const circuitJson = circuitJsonFixture as CircuitJson

test("repro: pcb_cutout geometry is missing from STEP exports", async () => {
  const stepText = await circuitJsonToStep(structuredClone(circuitJson))

  expect(stepText).toContain("ISO-10303-21")
  expect(stepText).toContain("END-ISO-10303-21")
  expect(stepText).toContain("MANIFOLD_SOLID_BREP")

  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)
  expect(occtResult.meshes).toHaveLength(1)
  const board = occtResult.meshes[0]!

  const circleCutout = circuitJson.find(
    (element): element is PcbCutoutCircle =>
      element.type === "pcb_cutout" &&
      element.shape === "circle" &&
      element.pcb_cutout_id === "pcb_cutout_circle_0",
  )!

  // The first circular cutout should be empty space (0 crossings). The exporter
  // currently ignores pcb_cutout, so the ray hits the solid board twice.
  expect(
    countCrossings({
      mesh: board,
      x: circleCutout.center.x,
      y: circleCutout.center.y,
    }),
  ).toBe(2)

  await expect(stepText).toMatchStepSnapshot(
    import.meta.path,
    "pcb-cutout-step-export",
  )
})
