import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import circuitJson from "./basics16.json"

test("basics16: reproduce ignored printed-part CAD color overrides", async () => {
  const files = await circuitJsonToStep(circuitJson as CircuitJson, {
    exportMode: "assembly",
  })
  // The orange CAD override exports as blue, and the red override exports
  // as gray. These snapshots capture the current color mismatch.
  expect(Object.keys(files)).toEqual(["ORANGE_CASE.step", "RED_PLATE.step"])
  for (const [fileName, step] of Object.entries(files)) {
    const name = fileName.replace(/\.step$/, "")
    await expect(step).toMatchStepSnapshot(import.meta.path, `exported-${name}`)
  }
})
