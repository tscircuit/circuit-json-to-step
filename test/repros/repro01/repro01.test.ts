import { test, expect } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./repro01.json"

test("basics04: convert circuit json with components to STEP", async () => {
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

  // Verify we have multiple solids (board + components)
  const solidCount = (stepText.match(/MANIFOLD_SOLID_BREP/g) || []).length
  expect(solidCount).toBeGreaterThanOrEqual(1)

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
