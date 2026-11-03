import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../lib"
import { expectFaceCoverage } from "./utils/mesh-coverage"
import { importStepWithOcct } from "./utils/occt/importer"
import fixture from "./fixtures/round-pill-pad-variants.json"

test("round pill drills remain open through both PCB faces across pad variants", async () => {
  const circuitJson = fixture as CircuitJson
  const step = await circuitJsonToStep(circuitJson, { exportMode: "pcb" })
  expect(step.match(/\b(?:NaN|Infinity)\b/g) ?? []).toEqual([])
  const imported = await importStepWithOcct(step)
  expect(imported.meshes).toHaveLength(1)
  const mesh = imported.meshes[0]!
  const geometry = {
    positions: mesh.attributes.position.array,
    indices: mesh.index.array,
    zTop: 0.8,
  }
  expectFaceCoverage(geometry, [[0, 0]], true)
  for (const hole of circuitJson) {
    if (hole.type !== "pcb_plated_hole") continue
    const centerX =
      hole.x + ("hole_offset_x" in hole ? (hole.hole_offset_x ?? 0) : 0)
    const centerY =
      hole.y + ("hole_offset_y" in hole ? (hole.hole_offset_y ?? 0) : 0)
    expectFaceCoverage(geometry, [[centerX, centerY]], false)
    expectFaceCoverage(geometry, [[centerX + 0.7, centerY]], true)
  }
}, 30_000)
