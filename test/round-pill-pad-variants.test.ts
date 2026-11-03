import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../lib"
import fixture from "./fixtures/round-pill-pad-variants.json"

test("round pill drills fail STEP export across pad variants", async () => {
  await expect(
    circuitJsonToStep(fixture as CircuitJson, { exportMode: "pcb" }),
  ).rejects.toThrow("STEP real must be finite")
})
