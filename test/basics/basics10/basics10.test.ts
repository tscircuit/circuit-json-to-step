import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics10.json"

test("basics10: explicit assembly mode exports printed parts from a mixed device", async () => {
  const step = await circuitJsonToStep(circuitJson as CircuitJson, {
    exportMode: "assembly",
    productName: "Device",
  })
  const imported = await importStepWithOcct(step)
  expect(imported.meshes).toHaveLength(1)
  expect(imported.meshes[0].name).toBe("BRACKET")
  expect(step).not.toContain("MOTOR")
  expect(step.match(/= PRODUCT\(/g)).toHaveLength(2)
  const pcb = await circuitJsonToStep(circuitJson as CircuitJson)
  expect(pcb).not.toContain("NEXT_ASSEMBLY_USAGE_OCCURRENCE")
  expect(pcb.match(/= PRODUCT\(/g)).toHaveLength(1)
  await expect(step).toMatchStepSnapshot(import.meta.path, "basics10")
}, 30_000)
