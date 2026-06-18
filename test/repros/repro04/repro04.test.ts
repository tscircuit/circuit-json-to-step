import { expect, test } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"

test("repro04: resistor blocks appear when cad_component lacks show_as_bounding_box", async () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_1",
      width: 20,
      height: 15,
      thickness: 1.6,
      center: { x: 10, y: 7.5 },
    },
    {
      type: "source_component",
      source_component_id: "sc1",
      name: "R1",
      ftype: "simple_resistor",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pc1",
      source_component_id: "sc1",
      center: { x: 5, y: 7.5 },
      width: 3,
      height: 1.5,
      layer: "top",
      rotation: 0,
    },
    {
      type: "cad_component",
      cad_component_id: "cc1",
      pcb_component_id: "pc1",
      source_component_id: "sc1",
      position: { x: 5, y: 7.5, z: 0.8 },
      rotation: { x: 0, y: 0, z: 0 },
    },
  ]

  const stepText = await circuitJsonToStep(circuitJson as any, {
    includeComponents: true,
    productName: "ResistorTest",
  })

  expect(stepText).toContain("ISO-10303-21")
  expect(stepText).toContain("END-ISO-10303-21")

  const solidCount = (stepText.match(/MANIFOLD_SOLID_BREP/g) || []).length
  expect(solidCount).toBeGreaterThanOrEqual(2)

  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)
  expect(occtResult.meshes.length).toBeGreaterThanOrEqual(2)
}, 20000)
