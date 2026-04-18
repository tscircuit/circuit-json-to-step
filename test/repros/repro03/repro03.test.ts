import { test, expect } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./repro03.json"

/**
 * Regression test for issue #6: component boxes (resistor blocks) were missing
 * from STEP output because all component triangles were merged into a single
 * ClosedShell, producing invalid topology that STEP viewers silently discard.
 *
 * The fix creates one ManifoldSolidBrep per component box, so each block appears
 * as a separate solid. This test verifies the exact solid count so a regression
 * would immediately fail.
 */
test("repro03: each component box appears as a separate solid in STEP output (issue #6)", async () => {
  const COMPONENT_COUNT = 4 // R1, R2, R3, R4
  const EXPECTED_SOLID_COUNT = COMPONENT_COUNT + 1 // board + 4 resistor boxes

  const stepText = await circuitJsonToStep(circuitJson as any, {
    includeComponents: true,
    productName: "Repro03_ResistorBlocks",
  })

  // Verify STEP format
  expect(stepText).toContain("ISO-10303-21")
  expect(stepText).toContain("END-ISO-10303-21")

  // Each component box must be its own ManifoldSolidBrep — the core fix for issue #6.
  // Before the fix, all component triangles were merged into a single ClosedShell,
  // yielding invalid topology and invisible boxes in STEP viewers.
  const solidCount = (stepText.match(/MANIFOLD_SOLID_BREP/g) || []).length
  expect(solidCount).toBe(EXPECTED_SOLID_COUNT)

  // Write STEP file to debug-output
  const outputPath = "debug-output/repro03.step"
  await Bun.write(outputPath, stepText)

  console.log(
    `✓ STEP file generated with ${solidCount} solids (1 board + ${COMPONENT_COUNT} resistor boxes)`,
  )
  console.log(`  - STEP text length: ${stepText.length} bytes`)
  console.log(`  - Output: ${outputPath}`)

  // Validate STEP file can be imported with occt-import-js
  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)

  // OCCT must produce at least one mesh per component box plus the board
  expect(occtResult.meshes.length).toBeGreaterThanOrEqual(EXPECTED_SOLID_COUNT)

  const [firstMesh] = occtResult.meshes
  expect(firstMesh.attributes.position.array.length).toBeGreaterThan(0)
  expect(firstMesh.index.array.length).toBeGreaterThan(0)

  console.log(
    `✓ STEP file validated by occt-import-js: ${occtResult.meshes.length} meshes`,
  )
}, 30000)
