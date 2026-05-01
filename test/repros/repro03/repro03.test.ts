/**
 * Regression test for https://github.com/tscircuit/circuit-json-to-step/issues/6
 *
 * Problem: Component boxes (resistors, capacitors, etc.) were missing from STEP
 * output. The root cause was that all component triangles were being merged into
 * a single ManifoldSolidBrep, which is invalid STEP topology — a ClosedShell
 * must be a single connected closed surface. STEP viewers silently discarded the
 * invalid geometry, leaving only the bare board visible.
 *
 * Fix: Each component box must get its own ManifoldSolidBrep. The output should
 * contain one solid for the board plus one solid per pcb_component.
 */
import { test, expect } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./repro03.json"

test("repro03: component boxes appear as separate solids in STEP output (issue #6)", async () => {
  const stepText = await circuitJsonToStep(circuitJson as any, {
    includeComponents: true,
    includeExternalMeshes: false,
  })

  // Count pcb_components in the fixture
  const pcbComponentCount = (circuitJson as any[]).filter(
    (e) => e.type === "pcb_component",
  ).length
  expect(pcbComponentCount).toBe(3) // sanity-check the fixture

  // Count ManifoldSolidBrep entries in the STEP file.
  // Before the fix: solidCount === 1 (board only — components were silently dropped).
  // After the fix: solidCount === pcbComponentCount + 1 (board + one per component).
  const solidCount = (stepText.match(/MANIFOLD_SOLID_BREP/g) ?? []).length
  expect(solidCount).toBeGreaterThanOrEqual(pcbComponentCount + 1)

  // Validate with occt-import-js: every solid must produce at least one
  // importable mesh, proving the geometry is valid STEP topology.
  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)
  expect(occtResult.meshes.length).toBeGreaterThanOrEqual(pcbComponentCount + 1)

  console.log(
    `✓ repro03: ${solidCount} solids, ${occtResult.meshes.length} occt meshes (expected ≥ ${pcbComponentCount + 1})`,
  )
}, 30000)
