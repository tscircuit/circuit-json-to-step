import { test, expect } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics07.json"

test("basics07: resistor rectangles appear as individual box solids in STEP output", async () => {
  const stepText = await circuitJsonToStep(circuitJson as any, {
    includeComponents: true,
    productName: "TestPCB_Resistors",
  })

  // Verify STEP format
  expect(stepText).toContain("ISO-10303-21")
  expect(stepText).toContain("END-ISO-10303-21")

  // Verify we have 4 solids: 1 board + 3 resistor boxes
  const solidCount = (stepText.match(/MANIFOLD_SOLID_BREP/g) || []).length
  expect(solidCount).toBe(4)

  // Write STEP file to debug-output
  const outputPath = "debug-output/basics07.step"
  await Bun.write(outputPath, stepText)

  console.log("✓ STEP file generated successfully")
  console.log(`  - Solids created: ${solidCount}`)
  console.log(`  - STEP text length: ${stepText.length} bytes`)
  console.log(`  - Output: ${outputPath}`)

  // Validate STEP file can be imported with occt-import-js
  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)

  // Filter out empty meshes
  const nonEmptyMeshes = occtResult.meshes.filter(
    (m: any) => m.attributes.position.array.length > 0,
  )

  // Should have at least 4 non-empty meshes (board + 3 resistors)
  expect(nonEmptyMeshes.length).toBeGreaterThanOrEqual(4)

  console.log(`  - Non-empty meshes from occt: ${nonEmptyMeshes.length}`)
  console.log("✓ STEP file successfully validated with occt-import-js")
}, 30000)
