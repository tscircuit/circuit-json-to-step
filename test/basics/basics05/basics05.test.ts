import { test, expect } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics05.json"
import { FULL_CIRCLE_SEGMENTS } from "../../../lib/segment-geometry"

test("basics05: new test to cause a diff error", async () => {
  const stepText = await circuitJsonToStep(circuitJson as any, {
    exportMode: "pcb",
    boardWidth: 20,
    boardHeight: 15,
    boardThickness: 1.6,
    productName: "TestPCB_DiffError",
  })

  // Verify STEP format
  expect(stepText).toContain("ISO-10303-21")
  expect(stepText).toContain("END-ISO-10303-21")

  // Verify product structure
  expect(stepText).toContain("TestPCB_DiffError")
  expect(stepText).toContain("MANIFOLD_SOLID_BREP")

  // Verify holes are created (should have CIRCLE and CYLINDRICAL_SURFACE entities)
  expect(stepText).toContain("CIRCLE")
  expect(stepText).toContain("CYLINDRICAL_SURFACE")

  // Each circular hole is bounded by FULL_CIRCLE_SEGMENTS arcs on both the top
  // and bottom plane, and each arc becomes one cylindrical wall.
  const circleCount = (stepText.match(/CIRCLE/g) || []).length
  expect(circleCount).toBe(3 * 2 * FULL_CIRCLE_SEGMENTS)

  const cylinderCount = (stepText.match(/CYLINDRICAL_SURFACE/g) || []).length
  expect(cylinderCount).toBe(3 * FULL_CIRCLE_SEGMENTS)

  // Write STEP file to debug-output
  const outputPath = "debug-output/basics05.step"
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

  await expect(stepText).toMatchStepSnapshot(import.meta.path, "basics05")
}, 20000)
