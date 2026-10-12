import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics07.json"

test("basics07: default assembly export produces one named STEP file per printed part", async () => {
  const files = await circuitJsonToStep(circuitJson as CircuitJson, {
    productName: "Printed device",
  })
  if (typeof files === "string") throw new Error("Expected separate part files")
  expect(Object.keys(files)).toEqual(["LEFT_s_bracket.step", "RIGHT.step"])
  for (const [fileName, step] of Object.entries(files)) {
    const name = fileName === "RIGHT.step" ? "RIGHT" : "LEFT's bracket"
    expect(step.match(/= PRODUCT\(/g)).toHaveLength(2)
    expect(step.match(/= MANIFOLD_SOLID_BREP\(/g)).toHaveLength(1)
    expect(step.match(/NEXT_ASSEMBLY_USAGE_OCCURRENCE/g)).toHaveLength(1)
    expect(step.match(/CONTEXT_DEPENDENT_SHAPE_REPRESENTATION/g)).toHaveLength(
      1,
    )
    const imported = await importStepWithOcct(step)
    expect(imported.success).toBe(true)
    expect(imported.meshes).toHaveLength(1)
    expect(imported.meshes[0].name).toBe(name)
    expect(imported.root.children[0]).toEqual({
      name: "Printed device",
      meshes: [],
      children: [{ name, meshes: [0], children: [] }],
    })
    await Bun.write(`debug-output/basics07-${fileName}`, step)
    await expect(step).toMatchStepSnapshot(
      import.meta.path,
      fileName.replace(/\.step$/, ""),
    )
  }
}, 30_000)
