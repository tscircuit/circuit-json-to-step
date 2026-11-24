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
  test(`#195: ${route} export drills the via through the substrate`, async () => {
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
    // The entire 1 mm drill is open on BOTH faces.
    expectFaceCoverage(
      mesh,
      [
        [0, 0],
        [0.3, 0],
        [0, 0.3],
      ],
      false,
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
      expect(step.match(/= CYLINDRICAL_SURFACE\(/g) ?? []).toHaveLength(2)
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

test("via drills honor layer extent and board ownership", async () => {
  const circuit = fixture as CircuitJson
  const board = circuit.find((item) => item.type === "pcb_board")!
  const via = circuit.find((item) => item.type === "pcb_via")!
  // Cover current drill metadata, legacy from/to metadata, and layer-only JSON.
  for (const fields of [
    { from_layer: undefined, to_layer: undefined },
    { from_layer: "bottom", to_layer: "top" },
    { topmost_drill_layer: "top", bottommost_drill_layer: "bottom" },
    { through_hole: true, layers: ["inner1", "inner2"] },
  ] as Partial<typeof via>[]) {
    const step = await circuitJsonToStep([board, { ...via, ...fields }], {
      exportMode: "pcb",
    })
    expect(step.match(/= CYLINDRICAL_SURFACE\(/g)).toHaveLength(2)
  }
  // A blind/buried via must not become an unintended through-board drill.
  for (const fields of [
    { through_hole: false },
    { topmost_drill_layer: "top", bottommost_drill_layer: "inner1" },
    { from_layer: "inner1", to_layer: "inner2", layers: ["inner1", "inner2"] },
  ] as Partial<typeof via>[]) {
    const step = await circuitJsonToStep([board, { ...via, ...fields }], {
      exportMode: "pcb",
    })
    expect(step.match(/= CYLINDRICAL_SURFACE\(/g) ?? []).toHaveLength(0)
  }
  // Overlapping board bounds make ownership observable: only the first is drilled.
  const boards: CircuitJson = [
    board,
    { ...board, pcb_board_id: "other_board", subcircuit_id: "other" },
    via,
  ]
  const result = await importStepWithOcct(await circuitJsonToStep(boards))
  expect(result.meshes).toHaveLength(2)
  for (const [index, mesh] of result.meshes.entries()) {
    expectFaceCoverage(
      {
        positions: mesh.attributes.position.array,
        indices: mesh.index.array,
        zTop: 0.8,
      },
      [[0, 0]],
      index === 1,
    )
  }
  await expect(
    circuitJsonToStep([
      ...boards.slice(0, 2),
      { ...via, subcircuit_id: undefined },
    ]),
  ).rejects.toThrow("Cannot determine which PCB owns a hole")
})
