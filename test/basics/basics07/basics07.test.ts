import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics07.json"

test("basics07: default assembly export produces one named STEP assembly", async () => {
  const step = await circuitJsonToStep(circuitJson as CircuitJson, {
    productName: "Printed device",
  })
  expect(typeof step).toBe("string")
  expect(step.startsWith("ISO-10303-21;")).toBe(true)
  expect(step.match(/= PRODUCT\(/g)).toHaveLength(3)
  expect(step.match(/= MANIFOLD_SOLID_BREP\(/g)).toHaveLength(2)
  expect(step.match(/NEXT_ASSEMBLY_USAGE_OCCURRENCE/g)).toHaveLength(2)
  const imported = await importStepWithOcct(step)
  expect(imported.meshes.map((mesh) => mesh.name)).toEqual([
    "LEFT's bracket",
    "RIGHT",
  ])
  expect(imported.root.children[0]).toEqual({
    name: "Printed device",
    meshes: [],
    children: [
      { name: "LEFT's bracket", meshes: [0], children: [] },
      { name: "RIGHT", meshes: [1], children: [] },
    ],
  })
  await expect(step).toMatchStepSnapshot(import.meta.path, "assembly")
}, 30_000)
