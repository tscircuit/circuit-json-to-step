import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToPrintedPartStepFiles } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import transformed from "../basics08/basics08.json"
import missing from "../basics11/basics11.json"
import circuitJson from "./basics14.json"

test("basics14: touching base and plate export to independent STEP files", async () => {
  const files = circuitJsonToPrintedPartStepFiles(circuitJson as CircuitJson)
  expect(Object.keys(files)).toEqual(["CASE_BASE.step", "SWITCH_PLATE.step"])
  for (const [fileName, step] of Object.entries(files)) {
    const name = fileName.replace(/\.step$/, "")
    const imported = await importStepWithOcct(step)
    expect(imported.success).toBe(true)
    expect(imported.meshes).toHaveLength(1)
    expect(imported.meshes[0].name).toBe(name)
    expect(step.match(/MANIFOLD_SOLID_BREP/g)).toHaveLength(1)
    expect(step).not.toContain(
      name === "CASE_BASE" ? "SWITCH_PLATE" : "CASE_BASE",
    )
    expect(step).not.toContain("SCREW")
    await expect(step).toMatchStepSnapshot(import.meta.path, name)
  }
}, 30_000)

test("basics14: separate export preserves origin, units, rotation, and placement", async () => {
  const files = circuitJsonToPrintedPartStepFiles(transformed as CircuitJson)
  const imported = await importStepWithOcct(files["ROTATED.step"])
  const positions = imported.meshes[0].attributes.position.array
  for (const [axis, min, max] of [
    [0, 12, 16],
    [1, 24, 32],
    [2, 30, 42],
  ]) {
    const coordinates = positions.filter((_, index) => index % 3 === axis)
    expect(Math.min(...coordinates)).toBeCloseTo(min)
    expect(Math.max(...coordinates)).toBeCloseTo(max)
  }
})

test("basics14: safe unique filenames retain every part and every associated CAD model", async () => {
  const input = structuredClone(circuitJson) as CircuitJson
  for (const item of input) {
    if (item.type === "source_component" && item.ftype === "printedpart") {
      item.name = "../Case/base"
    }
  }
  const model = input.find((item) => item.type === "cad_component")!
  if (model.type !== "cad_component") throw new Error("Missing CAD fixture")
  input.push({ ...model, cad_component_id: "second_model" })
  const files = circuitJsonToPrintedPartStepFiles(input)
  expect(Object.keys(files)).toEqual(["Case_base.step", "Case_base-2.step"])
  expect(
    (await importStepWithOcct(files["Case_base.step"])).meshes,
  ).toHaveLength(2)
  expect(
    (await importStepWithOcct(files["Case_base-2.step"])).meshes,
  ).toHaveLength(1)
  expect(() => circuitJsonToPrintedPartStepFiles([])).toThrow(
    "No assembly.printedpart",
  )
  expect(() =>
    circuitJsonToPrintedPartStepFiles(missing as CircuitJson),
  ).toThrow("needs JSCAD geometry")
})
