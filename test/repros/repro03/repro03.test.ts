import { expect, test } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./repro03.json"

test("repro03: reproduces fallback boxes for hole wrapper components", async () => {
  const stepText = await circuitJsonToStep(circuitJson as any, {
    includeComponents: true,
    productName: "Repro03",
  })

  expect(stepText).toContain("ISO-10303-21")
  expect(stepText).toContain("END-ISO-10303-21")
  expect(stepText).toContain("Repro03")
  expect(stepText).toContain("MANIFOLD_SOLID_BREP")
  expect(stepText).toContain("CYLINDRICAL_SURFACE")

  // Guard: hole-wrapper pcb_components (subcircuit containers with
  // obstructs_within_bounds) must NOT receive fallback component boxes.
  // Any regression restoring the erroneous fallback would reintroduce
  // these labels in the STEP output.
  expect(stepText).not.toContain("Xpattern1")
  expect(stepText).not.toContain("Xpattern4")

  // Guard against #6 regression: since all pcb_components in this fixture
  // are hole-wrapper containers, no component fallback boxes should be
  // generated — the STEP output must contain exactly one board solid.
  const solidCount = (stepText.match(/MANIFOLD_SOLID_BREP/g) || []).length
  expect(solidCount).toBe(1)

  const outputPath = "debug-output/repro03.step"
  await Bun.write(outputPath, stepText)

  console.log("\u2713 STEP file generated successfully")
  console.log(`  - Solids created: ${solidCount}`)

  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)
  expect(occtResult.meshes.length).toBeGreaterThan(0)

  await expect(stepText).toMatchStepSnapshot(import.meta.path, "repro03")
})
