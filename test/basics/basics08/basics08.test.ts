import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics08.json"

test("basics08: assembly placement preserves origin, scale, and Euler rotation", async () => {
  const files = await circuitJsonToStep(circuitJson as CircuitJson, {
    exportMode: "assembly",
  })
  const step = files["ROTATED.step"]
  const imported = await importStepWithOcct(step)
  expect(imported.meshes).toHaveLength(1)
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
  await Bun.write("debug-output/basics08.step", step)
  await expect(step).toMatchStepSnapshot(import.meta.path, "basics08")
}, 30_000)
