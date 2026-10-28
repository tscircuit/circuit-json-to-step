import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../lib/index"
import { importStepWithOcct } from "./utils/occt/importer"

test("the default export includes a PCB and electronic component without assembly-part tags", async () => {
  const circuit = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      width: 20,
      height: 10,
      thickness: 1.6,
      center: { x: 0, y: 0 },
    },
    {
      type: "source_component",
      source_component_id: "resistor",
      ftype: "simple_resistor",
      name: "R1",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_resistor",
      source_component_id: "resistor",
      width: 2,
      height: 1,
      center: { x: 0, y: 0 },
      layer: "top",
      rotation: 0,
    },
    {
      type: "cad_component",
      cad_component_id: "cad_resistor",
      pcb_component_id: "pcb_resistor",
      source_component_id: "resistor",
      position: { x: 0, y: 0, z: 1.3 },
      model_jscad: { type: "cuboid", size: [2, 1, 1] },
    },
  ] as CircuitJson

  const step = await circuitJsonToStep(circuit)
  const imported = await importStepWithOcct(step)
  expect(step).toStartWith("ISO-10303-21;")
  expect(imported.meshes.map((mesh) => mesh.name)).toEqual(["PCB", "R1"])
  expect(imported.root.children[0].children.map((child) => child.name)).toEqual(
    ["PCB", "R1"],
  )
})

test("the default export supports bare CAD geometry without a PCB or source-part tags", async () => {
  const circuit = [
    {
      type: "cad_component",
      cad_component_id: "standalone_model",
      source_component_id: "unknown",
      position: { x: 0, y: 0, z: 0 },
      model_jscad: { type: "cuboid", size: [4, 3, 2] },
    },
  ] as CircuitJson
  const imported = await importStepWithOcct(await circuitJsonToStep(circuit))
  expect(imported.meshes.map((mesh) => mesh.name)).toEqual(["standalone_model"])
  expect(imported.root.children[0].children).toHaveLength(1)
})
