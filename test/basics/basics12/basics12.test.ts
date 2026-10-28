import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import circuitJson from "./basics12.json"

test("basics12: reject disabled external printed-part geometry instead of omitting it", async () => {
  await expect(
    circuitJsonToStep(circuitJson as CircuitJson, {
      includeExternalMeshes: false,
    }),
  ).rejects.toThrow('External mesh export is disabled for part "IMPORTED"')
})
