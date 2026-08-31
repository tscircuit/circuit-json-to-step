import { test, expect } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./repro01.json"

test("basics04: convert circuit json with components to STEP", async () => {
  // This fixture intentionally marks the OBJ cad_component as a fallback box in its circuit-json so
  // the test stays local and deterministic. Core should not emit
  // show_as_bounding_box together with a real model URL.
  const stepText = await circuitJsonToStep(circuitJson as any, {
    includeComponents: true,
    productName: "TestPCB_with_components",
  })

  // Verify STEP format
  expect(stepText).toContain("ISO-10303-21")
  expect(stepText).toContain("END-ISO-10303-21")

  // Verify product structure
  expect(stepText).toContain("TestPCB_with_components")
  expect(stepText).toContain("MANIFOLD_SOLID_BREP")

  // Verify holes are created
  expect(stepText).toContain("CIRCLE")
  expect(stepText).toContain("CYLINDRICAL_SURFACE")

  // Verify the repro keeps all fallback component rectangles as separate solids.
  // The issue originally allowed missing component boxes to go unnoticed because
  // a board-only STEP export still has one MANIFOLD_SOLID_BREP.
  const solidCount = (stepText.match(/MANIFOLD_SOLID_BREP/g) || []).length
  expect(solidCount).toBe(5)

  // Write STEP file to debug-output
  const outputPath = "debug-output/repro01.step"
  await Bun.write(outputPath, stepText)

  console.log("✓ STEP file with components generated successfully")
  console.log(`  - Solids created: ${solidCount}`)
  console.log(`  - STEP text length: ${stepText.length} bytes`)
  console.log(`  - Output: ${outputPath}`)

  // Validate STEP file can be imported with occt-import-js
  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)
  expect(occtResult.meshes.length).toBeGreaterThan(0)

  const [firstMesh] = occtResult.meshes
  expect(firstMesh.attributes.position.array.length).toBeGreaterThan(0)
  expect(firstMesh.index.array.length).toBeGreaterThan(0)

  console.log("✓ STEP file successfully validated with occt-import-js")

  await expect(stepText).toMatchStepSnapshot(import.meta.path, "repro01")
}, 30000)
