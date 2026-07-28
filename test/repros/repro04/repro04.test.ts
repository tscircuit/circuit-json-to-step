import { expect, test } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./repro04.json"

test("repro04: pcb_components without cad_component produce fallback box solids", async () => {
  const stepText = await circuitJsonToStep(circuitJson as any, {
    includeComponents: true,
    productName: "Repro04",
  })

  expect(stepText).toContain("ISO-10303-21")
  expect(stepText).toContain("END-ISO-10303-21")
  expect(stepText).toContain("Repro04")

  // Board + 2 component fallback boxes = 3 solids
  const solidCount = (stepText.match(/MANIFOLD_SOLID_BREP/g) ?? []).length
  expect(solidCount).toBe(3)

  const outputPath = "debug-output/repro04.step"
  await Bun.write(outputPath, stepText)

  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)
  expect(occtResult.meshes.length).toBeGreaterThanOrEqual(3)
}, 30000)
