import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics16.json"

test("basics16: one STEP assembly preserves CAD color overrides", async () => {
  const step = await circuitJsonToStep(circuitJson as CircuitJson, {
    exportMode: "assembly",
  })
  const imported = await importStepWithOcct(step)
  expect(imported.meshes.map((mesh) => mesh.name)).toEqual([
    "ORANGE_CASE",
    "RED_PLATE",
  ])
  expect(imported.meshes[0].color![0]).toBe(1)
  expect(imported.meshes[0].color![1]).toBeCloseTo(0.1328683)
  expect(imported.meshes[0].color![2]).toBe(0)
  expect(imported.meshes[1].color).toEqual([1, 0, 0])
  await expect(step).toMatchStepSnapshot(import.meta.path, "assembly")
})
