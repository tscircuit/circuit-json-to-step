import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics09.json"

test("basics09: touching printed parts export to separate STEP files by default", async () => {
  const files = await circuitJsonToStep(circuitJson as CircuitJson)
  if (typeof files === "string") throw new Error("Expected separate part files")
  expect(Object.keys(files)).toEqual(["FIRST.step", "SECOND.step"])
  for (const [fileName, step] of Object.entries(files)) {
    const imported = await importStepWithOcct(step)
    expect(imported.meshes).toHaveLength(1)
    expect(imported.meshes[0].name).toBe(fileName.replace(/\.step$/, ""))
    expect(step.match(/NEXT_ASSEMBLY_USAGE_OCCURRENCE/g)).toHaveLength(1)
    await Bun.write(`debug-output/basics09-${fileName}`, step)
    await expect(step).toMatchStepSnapshot(
      import.meta.path,
      fileName.replace(/\.step$/, ""),
    )
  }
}, 30_000)
