import { test, expect } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics04.json"

test("basics04: convert circuit json with components to STEP", async () => {
  const stepText = await circuitJsonToStep(circuitJson as any, {
    includeComponents: true,
    includeExternalMeshes: true,
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

  // Verify we have multiple solids (board + one per component)
  // Regression test for issue #6: component rectangles were missing because all
  // component boxes were merged into a single ManifoldSolidBrep (invalid STEP
  // topology). Now each component box gets its own solid.
  const solidCount = (stepText.match(/MANIFOLD_SOLID_BREP/g) || []).length
  const pcbComponentCount = (circuitJson as any[]).filter(
    (e) => e.type === "pcb_component",
  ).length
  // Expect: 1 board solid + 1 solid per pcb_component
  expect(solidCount).toBeGreaterThanOrEqual(pcbComponentCount + 1)

  // Write STEP file to debug-output
  const outputPath = "debug-output/basics04.step"
  await Bun.write(outputPath, stepText)

  console.log("✓ STEP file with components generated successfully")
  console.log(`  - Solids created: ${solidCount}`)
  console.log(`  - STEP text length: ${stepText.length} bytes`)
  console.log(`  - Output: ${outputPath}`)

  // Validate STEP file can be imported with occt-import-js
  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)
  // Each solid should produce at least one mesh in occt — verifies components
  // are individually visible (not silently discarded as invalid topology)
  expect(occtResult.meshes.length).toBeGreaterThanOrEqual(pcbComponentCount + 1)

  const [firstMesh] = occtResult.meshes
  expect(firstMesh.attributes.position.array.length).toBeGreaterThan(0)
  expect(firstMesh.index.array.length).toBeGreaterThan(0)

  console.log("✓ STEP file successfully validated with occt-import-js")
  console.log(
    `  - occt meshes: ${occtResult.meshes.length} (expected ≥ ${pcbComponentCount + 1})`,
  )

  await expect(stepText).toMatchStepSnapshot(import.meta.path, "basics04")
}, 30000)
