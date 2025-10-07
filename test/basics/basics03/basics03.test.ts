import { expect, test } from "bun:test"
import { writeFileSync } from "node:fs"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics03.json"

test("basics03: convert pcb_board with arrow outline and pcb_plated_holes to STEP", async () => {
  const stepText = circuitJsonToStep(circuitJson, {
    productName: "TestPCB_ArrowWithPlatedHoles",
  })

  // Verify STEP format
  expect(stepText).toContain("ISO-10303-21")
  expect(stepText).toContain("END-ISO-10303-21")

  // Verify product structure
  expect(stepText).toContain("TestPCB_ArrowWithPlatedHoles")
  expect(stepText).toContain("MANIFOLD_SOLID_BREP")

  // Write STEP file to debug-output
  const outputPath = "debug-output/basics03.step"
  writeFileSync(outputPath, stepText)

  console.log("✓ STEP file generated successfully")
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
