import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import circuitJson from "./basics13.json"

test("basics13: reject JSCAD models whose boolean operations leave no solid", async () => {
  await expect(circuitJsonToStep(circuitJson as CircuitJson)).rejects.toThrow(
    'Part "EMPTY" has no solid geometry to export',
  )
})
