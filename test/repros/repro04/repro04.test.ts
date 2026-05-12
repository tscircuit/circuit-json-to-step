import { expect, test } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"

test("repro04: exports rectangular pcb artwork solids", async () => {
  const stepText = await circuitJsonToStep(
    [
      {
        type: "pcb_board",
        width: 12,
        height: 10,
        center: { x: 0, y: 0 },
        thickness: 1.6,
      },
      {
        type: "pcb_smtpad",
        shape: "rect",
        pcb_smtpad_id: "top_rect_pad",
        x: -2,
        y: 1,
        width: 2,
        height: 1,
        layer: "top",
      },
      {
        type: "pcb_smtpad",
        shape: "rotated_rect",
        pcb_smtpad_id: "bottom_rotated_pad",
        x: 2,
        y: -1,
        width: 2,
        height: 1,
        layer: "bottom",
        ccw_rotation: 45,
      },
      {
        type: "pcb_solder_paste",
        shape: "rect",
        pcb_solder_paste_id: "paste_rect",
        x: 0,
        y: 2,
        width: 1.5,
        height: 0.75,
        layer: "top",
      },
      {
        type: "pcb_silkscreen_rect",
        pcb_silkscreen_rect_id: "outline_rect",
        center: { x: 0, y: -2 },
        width: 3,
        height: 1.5,
        layer: "top",
        stroke_width: 0.15,
      },
    ] as any,
    { productName: "RectArtwork" },
  )

  expect(stepText).toContain("RectArtwork")
  expect(stepText).toContain("top_rect_pad")
  expect(stepText).toContain("bottom_rotated_pad")
  expect(stepText).toContain("paste_rect")
  expect(stepText).toContain("outline_rect_top")
  expect(stepText).toContain("outline_rect_bottom")
  expect(stepText).toContain("outline_rect_left")
  expect(stepText).toContain("outline_rect_right")

  const solidCount = (stepText.match(/MANIFOLD_SOLID_BREP/g) || []).length
  expect(solidCount).toBe(8)

  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)
  expect(occtResult.meshes.length).toBeGreaterThan(0)
})
