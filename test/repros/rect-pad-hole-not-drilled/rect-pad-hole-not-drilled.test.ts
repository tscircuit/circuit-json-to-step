import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib"
import { expectFaceCoverage } from "../../utils/mesh-coverage"
import { importStepWithOcct } from "../../utils/occt/importer"
import fixture from "./rect-pad-hole-not-drilled.json"

// #196, generated with @tscircuit/core@0.0.2464 (tscircuit@0.0.3288):
// <board width="20mm" height="20mm">
//   <platedhole shape="circular_hole_with_rect_pad" holeDiameter="1mm"
//     rectPadWidth="1.6mm" rectPadHeight="1.6mm" pcbX="-3mm" pcbY="0mm" />
//   <platedhole shape="circle" holeDiameter="1mm" outerDiameter="1.6mm"
//     pcbX="3mm" pcbY="0mm" />
// </board>
for (const route of ["pcb", "assembly", "panel"] as const) {
  test(`#196: ${route} export compares rectangular-pad and round-pad drills`, async () => {
    const circuit = fixture as CircuitJson
    const input: CircuitJson =
      route === "panel"
        ? [
            ...circuit,
            {
              type: "pcb_panel",
              pcb_panel_id: "panel",
              center: { x: 0, y: 0 },
              width: 20,
              height: 20,
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
    // Current bug: the rectangular-pad drill is missing except in panel mode.
    expectFaceCoverage(
      mesh,
      [
        [-3, 0],
        [-2.7, 0],
        [-3, 0.3],
      ],
      route !== "panel",
    )
    expectFaceCoverage(
      mesh,
      [
        [3, 0],
        [3.3, 0],
        [3, 0.3],
      ],
      false,
    )
    // Cut the drill, not the copper pad footprint.
    expectFaceCoverage(
      mesh,
      [
        [-2.35, 0],
        [3.65, 0],
      ],
      true,
    )
    if (route !== "panel") {
      expect(step.match(/= CYLINDRICAL_SURFACE\(/g) ?? []).toHaveLength(2)
    }
    if (route === "pcb") {
      await expect(step).toMatchStepSnapshot(
        import.meta.path,
        "rect-pad-hole-not-drilled",
        {
          camPos: [0, -12, 28],
          lookAt: [0, 0, 0],
          fov: 45,
        },
      )
    }
  })
}
