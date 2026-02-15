import { test, expect } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "../basics04/basics04.json"

test("separate-solids: each component gets its own ManifoldSolidBrep", async () => {
  const stepText = await circuitJsonToStep(circuitJson as any, {
    includeComponents: true,
    productName: "SeparateSolidsTest",
  })

  // Verify STEP format
  expect(stepText).toContain("ISO-10303-21")
  expect(stepText).toContain("END-ISO-10303-21")

  // Count ManifoldSolidBrep entries — should be at least 3:
  // 1 for the board + 1 per component (2 components in basics04)
  const solidMatches = stepText.match(/MANIFOLD_SOLID_BREP\s*\(\s*'([^']*)'/g) || []
  const solidNames = solidMatches.map((m) => {
    const nameMatch = m.match(/MANIFOLD_SOLID_BREP\s*\(\s*'([^']*)'/)
    return nameMatch?.[1] ?? ""
  })

  console.log(`  Solids found (${solidNames.length}):`)
  for (const name of solidNames) {
    console.log(`    - ${name}`)
  }

  // Board solid + at least 2 separate component solids
  expect(solidNames.length).toBeGreaterThanOrEqual(3)

  // Each component should have its own named solid (not a single merged "Components")
  expect(solidNames.some((n) => n === "Components")).toBe(false)

  // Validate STEP file with occt-import-js
  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)
  // Should have multiple meshes (one per solid)
  expect(occtResult.meshes.length).toBeGreaterThanOrEqual(3)

  console.log(`  occt meshes: ${occtResult.meshes.length}`)

  // Write debug output
  await Bun.write("debug-output/separate-solids.step", stepText)

  await expect(stepText).toMatchStepSnapshot(
    import.meta.path,
    "separate-solids",
  )
}, 30000)
