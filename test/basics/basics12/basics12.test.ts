import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import circuitJson from "./basics12.json"

test("basics12: reject unsupported imported printed parts instead of omitting them", async () => {
  await expect(circuitJsonToStep(circuitJson as CircuitJson)).rejects.toThrow(
    'Printed part "IMPORTED" needs JSCAD geometry',
  )
})
