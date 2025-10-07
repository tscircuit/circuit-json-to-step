import { writeFileSync } from "node:fs"
import { test, expect } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics01.json"

test("basics01: convert circuit json with circular holes to STEP", async () => {
  const stepText = circuitJsonToStep(circuitJson, {
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

  // Verify holes are created (should have CIRCLE entities)
  expect(stepText).toContain("CIRCLE")

  // Count CIRCLE occurrences - should have 6 (3 holes × 2 faces each)
  const circleCount = (stepText.match(/CIRCLE/g) || []).length
  expect(circleCount).toBe(6)

  // Write STEP file to debug-output
  const outputPath = "debug-output/basics01.step"
  writeFileSync(outputPath, stepText)

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
}, 20000)
