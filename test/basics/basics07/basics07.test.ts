import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics07.json"

test("basics07: export named printed parts as an assembly without a PCB", async () => {
  const step = await circuitJsonToStep(circuitJson as CircuitJson, {
    productName: "Printed device",
  })
  expect(step.match(/= PRODUCT\(/g)).toHaveLength(3)
  expect(step.match(/= MANIFOLD_SOLID_BREP\(/g)).toHaveLength(2)
  expect(step.match(/NEXT_ASSEMBLY_USAGE_OCCURRENCE/g)).toHaveLength(2)
  expect(step.match(/CONTEXT_DEPENDENT_SHAPE_REPRESENTATION/g)).toHaveLength(2)
  expect(step).toContain("LEFT''s bracket")
  const imported = await importStepWithOcct(step)
  expect(imported.success).toBe(true)
  expect(imported.meshes).toHaveLength(2)
  expect(imported.meshes.map((mesh) => mesh.name).sort()).toEqual([
    "LEFT's bracket",
    "RIGHT",
  ])
  expect(imported.root.children).toHaveLength(1)
  expect(imported.root.children[0]).toEqual({
    name: "Printed device",
    meshes: [],
    children: [
      { name: "LEFT's bracket", meshes: [0], children: [] },
      { name: "RIGHT", meshes: [1], children: [] },
    ],
  })
  await Bun.write("debug-output/basics07.step", step)
}, 30_000)
