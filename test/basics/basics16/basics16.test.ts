import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import circuitJson from "./basics16.json"

test("basics16: snapshot printed-part CAD color overrides against authored-color references", async () => {
  const files = await circuitJsonToStep(circuitJson as CircuitJson, {
    exportMode: "assembly",
  })
  // Author the intended viewer colors directly in JSCAD to create independent
  // reference images. Exporting CAD color overrides currently produces a blue
  // case and a gray plate instead of the orange case and red plate below.
  const reference = structuredClone(circuitJson) as CircuitJson
  for (const item of reference) {
    if (item.type !== "cad_component") continue
    item.model_jscad = {
      type: "colorize",
      color:
        item.source_component_id === "orange_case" ? [1, 0.4, 0] : [1, 0, 0],
      shape: item.model_jscad,
    }
    delete item.color
  }
  const expectedFiles = await circuitJsonToStep(reference, {
    exportMode: "assembly",
  })
  expect(Object.keys(files)).toEqual(["ORANGE_CASE.step", "RED_PLATE.step"])
  for (const [fileName, step] of Object.entries(files)) {
    const name = fileName.replace(/\.step$/, "")
    await expect(expectedFiles[fileName]).toMatchStepSnapshot(
      import.meta.path,
      `expected-${name}`,
    )
    await expect(step).toMatchStepSnapshot(import.meta.path, `exported-${name}`)
  }
})
