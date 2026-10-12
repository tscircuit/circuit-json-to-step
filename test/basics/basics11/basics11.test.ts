import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import circuitJson from "./basics11.json"

test("basics11: reject missing geometry and empty printed-part assemblies", async () => {
  await expect(circuitJsonToStep(circuitJson as CircuitJson)).rejects.toThrow(
    'Printed part "MISSING" needs JSCAD geometry',
  )
  await expect(
    circuitJsonToStep([], { exportMode: "assembly" }),
  ).rejects.toThrow("No assembly.printedpart elements found")
  await expect(
    circuitJsonToStep(circuitJson as CircuitJson, { exportMode: "pcb" }),
  ).rejects.toThrow("Board dimensions not found")
})
