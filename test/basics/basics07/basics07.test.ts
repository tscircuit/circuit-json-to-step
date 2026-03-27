import { test, expect } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics07.json"

test("basics07: resistor rectangles appear as proper box solids in STEP output", async () => {
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

  // Validate STEP file can be imported with occt-import-js
  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)

  // Filter out empty meshes
  const nonEmptyMeshes = occtResult.meshes.filter(
    (m) => m.attributes.position.array.length > 0,
  )

  // Should have at least 4 non-empty meshes (board + 3 resistors)
  expect(nonEmptyMeshes.length).toBeGreaterThanOrEqual(4)

  // Compute bounding boxes for each mesh
  const meshBounds = nonEmptyMeshes.map((mesh) => {
    const pos = mesh.attributes.position.array
    let minX = Infinity
    let minY = Infinity
    let minZ = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    let maxZ = -Infinity
    for (let i = 0; i < pos.length; i += 3) {
      minX = Math.min(minX, pos[i]!)
      maxX = Math.max(maxX, pos[i]!)
      minY = Math.min(minY, pos[i + 1]!)
      maxY = Math.max(maxY, pos[i + 1]!)
      minZ = Math.min(minZ, pos[i + 2]!)
      maxZ = Math.max(maxZ, pos[i + 2]!)
    }
    return {
      width: maxX - minX,
      height: maxY - minY,
      depth: maxZ - minZ,
    }
  })

  // Find the board mesh (largest by width)
  const boardMesh = meshBounds.find(
    (b) => Math.abs(b.width - 20) < 1 && Math.abs(b.height - 15) < 1,
  )
  expect(boardMesh).toBeDefined()

  // Find resistor meshes (should be roughly 3x1.5x1.5 boxes)
  const resistorMeshes = meshBounds.filter(
    (b) => Math.abs(b.width - 3) < 0.5 && Math.abs(b.height - 1.5) < 0.5,
  )
  // All 3 resistors should appear as proper box meshes
  expect(resistorMeshes.length).toBe(3)

  console.log(
    `  - Board: ${boardMesh!.width.toFixed(1)}x${boardMesh!.height.toFixed(1)}`,
  )
  console.log(`  - Resistor boxes found: ${resistorMeshes.length}`)

  await expect(stepText).toMatchStepSnapshot(import.meta.path, "basics07")
}, 30000)
