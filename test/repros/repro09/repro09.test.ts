import { expect, spyOn, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { jscadToStep } from "jscad-to-step"
import { circuitJsonToStep } from "../../../lib/index"
import circuit from "./repro09.json"

test("repro09: requested STEP models must not disappear from successful PCB exports", async () => {
  const valid = jscadToStep({ type: "cuboid", size: [4, 3, 4] })
  const inputs = [
    "ISO-10303-21;\nHEADER;\nENDSEC;\nDATA;\n#1 = THIS_IS_NOT ( VALID STEP\nENDSEC;\nEND-ISO-10303-21;",
    "",
    "ISO-10303-21;\nHEADER;\nENDSEC;\nDATA;\n#1 = CARTESIAN_POINT('',(0.,0.,0.));\nENDSEC;\nEND-ISO-10303-21;",
  ]
  const errors: unknown[] = []
  const warning = spyOn(console, "warn").mockImplementation(() => {})
  try {
    for (const broken of inputs) {
      try {
        await circuitJsonToStep(circuit as CircuitJson, {
          exportMode: "pcb",
          includeComponents: true,
          includeExternalMeshes: true,
          fsMap: { "U1.step": broken, "R1.step": valid },
        })
        errors.push(undefined)
      } catch (error) {
        errors.push(error)
      }
    }
  } finally {
    warning.mockRestore()
  }
  for (const error of errors) {
    expect(error).toMatchObject({
      message: 'Failed to import STEP model for component "U1" (U1.step)',
      cause: expect.any(Error),
    })
  }
})
