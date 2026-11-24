import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib"
import { expectFaceCoverage } from "../../utils/mesh-coverage"
import { importStepWithOcct } from "../../utils/occt/importer"

const circuit: CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 20,
    height: 16,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "square_hole_0",
    hole_shape: "square",
    hole_diameter: 2,
    x: 0,
    y: 0,
  },
]

for (const route of ["pcb", "assembly", "panel"] as const) {
  test(`${route} export cuts square pcb_hole openings`, async () => {
    const input: CircuitJson =
      route === "panel"
        ? [
            ...circuit,
            {
              type: "pcb_panel",
              pcb_panel_id: "panel_0",
              center: { x: 0, y: 0 },
              width: 20,
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

    // Inside 2mm x 2mm square hole centered at (0, 0) — including diagonal corners
    // where a 2mm circle would still leave substrate (dist = sqrt(0.8^2 + 0.8^2) = 1.13 > 1.0)
    expectFaceCoverage(
      mesh,
      [
        [0, 0],
        [0.8, 0.8],
        [-0.8, 0.8],
        [0.8, -0.8],
        [-0.8, -0.8],
      ],
      false,
    )

    // Outside the 2mm x 2mm square hole remains solid substrate
    expectFaceCoverage(
      mesh,
      [
        [1.5, 0],
        [-1.5, 0],
        [0, 1.5],
        [0, -1.5],
      ],
      true,
    )
  })
}
