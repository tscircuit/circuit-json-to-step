import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib"
import { expectFaceCoverage } from "../../utils/mesh-coverage"
import { importStepWithOcct } from "../../utils/occt/importer"

// Includes rectangular-pad pill holes both with omitted hole_shape (as produced
// by callers specifying only `shape`) and with rotated_pill_hole_with_rect_pad.
const circuit = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 24,
    height: 16,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pill_rect_pad_0",
    shape: "pill_hole_with_rect_pad",
    x: -5,
    y: 0,
    hole_width: 3,
    hole_height: 1,
    rect_pad_width: 4,
    rect_pad_height: 2,
    hole_offset_x: 0,
    hole_offset_y: 0,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "rotated_pill_rect_pad_0",
    shape: "rotated_pill_hole_with_rect_pad",
    x: 5,
    y: 0,
    hole_width: 3,
    hole_height: 1,
    hole_ccw_rotation: 90,
    rect_pad_width: 2,
    rect_pad_height: 4,
    rect_ccw_rotation: 0,
    hole_offset_x: 0.5,
    hole_offset_y: 0,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "round_pill_rect_pad_0",
    shape: "pill_hole_with_rect_pad",
    x: 0,
    y: 4,
    hole_width: 1.2,
    hole_height: 1.2,
    rect_pad_width: 2,
    rect_pad_height: 2,
    hole_offset_x: 0,
    hole_offset_y: 0,
    layers: ["top", "bottom"],
  },
] as unknown as CircuitJson

for (const route of ["pcb", "assembly", "panel"] as const) {
  test(`${route} export drills pill_hole_with_rect_pad and rotated_pill_hole_with_rect_pad`, async () => {
    const input: CircuitJson =
      route === "panel"
        ? [
            ...circuit,
            {
              type: "pcb_panel",
              pcb_panel_id: "panel_0",
              center: { x: 0, y: 0 },
              width: 24,
              height: 16,
              thickness: 1.6,
              covered_with_solder_mask: true,
            },
          ]
        : circuit

    const step = await circuitJsonToStep(input, {
      exportMode: route === "pcb" ? "pcb" : "assembly",
    })
    const imported = await importStepWithOcct(step)
    expect(imported.meshes).toHaveLength(1)
    const board = imported.meshes[0]!
    const mesh = {
      positions: board.attributes.position.array,
      indices: board.index.array,
      zTop: 0.8,
    }

    // Horizontal pill slot at (-5, 0): spans x in [-6.5, -3.5], y in [-0.5, 0.5]
    expectFaceCoverage(
      mesh,
      [
        [-5, 0],
        [-6, 0],
        [-4, 0],
      ],
      false,
    )
    expectFaceCoverage(
      mesh,
      [
        [-5, 0.9],
        [-5, -0.9],
      ],
      true,
    )

    // 90-degree rotated pill slot at (5.5, 0): spans x in [5.0, 6.0], y in [-1.5, 1.5]
    expectFaceCoverage(
      mesh,
      [
        [5.5, 0],
        [5.5, 1.0],
        [5.5, -1.0],
      ],
      false,
    )
    expectFaceCoverage(
      mesh,
      [
        [4.5, 0],
        [6.5, 0],
      ],
      true,
    )

    // Round pill drill (hole_width === hole_height = 1.2) at (0, 4)
    expectFaceCoverage(
      mesh,
      [
        [0, 4],
        [0.3, 4],
      ],
      false,
    )
    expectFaceCoverage(mesh, [[0, 4.9]], true)
  })
}
