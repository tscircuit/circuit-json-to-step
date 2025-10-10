import { test, expect } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics01.json"

test("basics01: convert circuit json with circular holes to STEP", async () => {
  const stepText = await circuitJsonToStep(circuitJson as any, {
    boardWidth: 20,
    boardHeight: 15,
    boardThickness: 1.6,
    productName: "TestPCB",
  })

  // Verify STEP format
  expect(stepText).toContain("ISO-10303-21")
  expect(stepText).toContain("END-ISO-10303-21")

  // Verify product structure
  expect(stepText).toContain("TestPCB")
  expect(stepText).toContain("MANIFOLD_SOLID_BREP")

  // Verify holes are created (should have CIRCLE and CYLINDRICAL_SURFACE entities)
  expect(stepText).toContain("CIRCLE")
  expect(stepText).toContain("CYLINDRICAL_SURFACE")

  // Count CIRCLE occurrences - should have 12 (3 holes × 4 circles each: 2 for top/bottom faces, 2 for cylindrical surface)
  const circleCount = (stepText.match(/CIRCLE/g) || []).length
  expect(circleCount).toBe(12)

  // Count CYLINDRICAL_SURFACE occurrences - should have 3 (one per hole)
  const cylinderCount = (stepText.match(/CYLINDRICAL_SURFACE/g) || []).length
  expect(cylinderCount).toBe(3)

  // Write STEP file to debug-output
  const outputPath = "debug-output/basics01.step"
  await Bun.write(outputPath, stepText)

  console.log("✓ STEP file generated successfully")
  console.log(`  - Circles created: ${circleCount}`)
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

  await expect(stepText).toMatchStepSnapshot(import.meta.path, "basics01")
}, 20000)
