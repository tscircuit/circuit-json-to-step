import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics09.json"

test("basics09: touching printed parts remain separate named solids", async () => {
  const step = await circuitJsonToStep(circuitJson as CircuitJson)
  const imported = await importStepWithOcct(step)
  expect(imported.meshes).toHaveLength(2)
  expect(imported.meshes.map((mesh) => mesh.name).sort()).toEqual([
    "FIRST",
    "SECOND",
  ])
  expect(step.match(/NEXT_ASSEMBLY_USAGE_OCCURRENCE/g)).toHaveLength(2)
  await Bun.write("debug-output/basics09.step", step)
  await expect(step).toMatchStepSnapshot(import.meta.path, "basics09")
}, 30_000)
