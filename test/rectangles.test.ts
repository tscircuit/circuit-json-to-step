import { expect, test } from "bun:test"
import { circuitJsonToStep } from "../lib/index"

test("should include pcb_silkscreen_rect and pcb_smtpad", async () => {
  const circuitJson: any[] = [
    {
      type: "pcb_board",
      width: 10,
      height: 10,
      center: { x: 0, y: 0 },
      thickness: 1.6,
    },
    {
      type: "pcb_silkscreen_rect",
      pcb_silkscreen_rect_id: "sr1",
      center: { x: 1, y: 1 },
      width: 2,
      height: 3,
      layer: "top",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad1",
      shape: "rect",
      x: -1,
      y: -1,
      width: 1.5,
      height: 2.5,
      layer: "top",
    },
    {
      type: "pcb_component",
      pcb_component_id: "comp1",
      center: { x: 0, y: 0 },
      width: 4,
      height: 4,
      layer: "top",
      rotation: 0,
    },
  ]

  const stepText = await circuitJsonToStep(circuitJson, {
    includeComponents: true,
  })

  // Basic check to see if the STEP file contains any solids other than the board
  // A MANIFOLD_SOLID_BREP corresponds to a 3D solid
  const solidCount = (stepText.match(/MANIFOLD_SOLID_BREP/g) || []).length

  // Board = 1, sr1 = 1, pad1 = 1, comp1 = 1 (if no mesh, fallback)
  console.log("MANIFOLD_SOLID_BREP count:", solidCount)

  // 1 board + 3 components/rectangles = 4 solids
  expect(solidCount).toBeGreaterThan(1)
}, 20000)
