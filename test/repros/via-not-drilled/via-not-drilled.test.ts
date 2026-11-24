import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib"
import { expectFaceCoverage } from "../../utils/mesh-coverage"
import { importStepWithOcct } from "../../utils/occt/importer"
import fixture from "./via-not-drilled.json"

// #195, generated with @tscircuit/core@0.0.2464 (tscircuit@0.0.3288):
// <board width="20mm" height="20mm">
//   <via pcbX="0mm" pcbY="0mm" fromLayer="top" toLayer="bottom"
//     holeDiameter="1mm" outerDiameter="1.6mm" />
// </board>
for (const route of ["pcb", "assembly", "panel"] as const) {
  test(`#195: ${route} export leaves the via drill covered`, async () => {
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
    // Current bug: substrate covers the entire 1 mm drill on BOTH faces.
    expectFaceCoverage(
      mesh,
      [
        [0, 0],
        [0.3, 0],
        [0, 0.3],
      ],
      true,
    )
    // The drill must not remove the surrounding annular pad area.
    expectFaceCoverage(
      mesh,
      [
        [0.65, 0],
        [0, 0.65],
      ],
      true,
    )
    if (route !== "panel") {
      expect(step.match(/= CYLINDRICAL_SURFACE\(/g) ?? []).toHaveLength(0)
    }
    if (route === "pcb") {
      await expect(step).toMatchStepSnapshot(
        import.meta.path,
        "via-not-drilled",
        {
          camPos: [0, -12, 28],
          lookAt: [0, 0, 0],
          fov: 45,
        },
      )
    }
  })
}
