import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics10.json"

test("basics10: mixed designs default to a complete assembly and retain explicit PCB mode", async () => {
  const options = { productName: "Device" }
  const step = await circuitJsonToStep(circuitJson as CircuitJson)
  expect(
    await circuitJsonToStep(circuitJson as CircuitJson, options),
  ).toContain("NEXT_ASSEMBLY_USAGE_OCCURRENCE")
  const imported = await importStepWithOcct(step)
  expect(imported.meshes.map((mesh) => mesh.name)).toEqual([
    "PCB",
    "BRACKET",
    "MOTOR",
  ])
  expect(imported.root.children[0].name).toBe("Combined Assembly")
  expect(imported.root.children[0].children).toHaveLength(3)
  const pcb = await circuitJsonToStep(circuitJson as CircuitJson, {
    exportMode: "pcb",
  })
  expect(pcb).not.toContain("NEXT_ASSEMBLY_USAGE_OCCURRENCE")
  expect((await importStepWithOcct(pcb)).meshes).toHaveLength(1)
}, 30_000)
