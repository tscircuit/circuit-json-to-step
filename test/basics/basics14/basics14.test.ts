import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics14.json"

test("basics14: PCB, printed parts, and ordinary assembly parts export together", async () => {
  const step = await circuitJsonToStep(circuitJson as CircuitJson)
  const imported = await importStepWithOcct(step)
  expect(imported.meshes.map((mesh) => mesh.name)).toEqual([
    "PCB",
    "CASE_BASE",
    "SWITCH_PLATE",
    "SCREW",
  ])
  expect(imported.root.children[0].children).toHaveLength(4)
  const input = structuredClone(circuitJson) as CircuitJson
  for (const item of input) {
    if (item.type === "source_component" && item.ftype === "printedpart")
      item.name = "../Case/base"
  }
  const model = input.find((item) => item.type === "cad_component")!
  if (model.type !== "cad_component") throw new Error("Missing CAD fixture")
  input.push({ ...model, cad_component_id: "second_model" })
  const duplicateNames = await importStepWithOcct(
    await circuitJsonToStep(input),
  )
  expect(duplicateNames.meshes).toHaveLength(5)
  expect(
    duplicateNames.meshes.filter((mesh) => mesh.name === "../Case/base"),
  ).toHaveLength(3)
  await expect(step).toMatchStepSnapshot(import.meta.path, "assembly")
}, 30_000)
