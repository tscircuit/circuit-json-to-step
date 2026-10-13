import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics09.json"

test("basics09: touching parts remain separate bodies in one STEP assembly", async () => {
  const step = await circuitJsonToStep(circuitJson as CircuitJson)
  const imported = await importStepWithOcct(step)
  expect(imported.meshes.map((mesh) => mesh.name)).toEqual(["FIRST", "SECOND"])
  expect(step.match(/NEXT_ASSEMBLY_USAGE_OCCURRENCE/g)).toHaveLength(2)
  expect(imported.root.children[0].children).toHaveLength(2)
  await expect(step).toMatchStepSnapshot(import.meta.path, "assembly")
}, 30_000)
