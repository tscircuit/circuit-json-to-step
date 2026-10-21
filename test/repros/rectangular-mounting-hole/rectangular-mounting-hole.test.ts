import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib"
import { importStepWithOcct, type OcctMesh } from "../../utils/occt/importer"
import circuitJson from "./rectangular-mounting-hole.json"

// Fixture generated with @tscircuit/core@0.0.2165 from:
// <board width={20} height={12} thickness={1.6}>
//   <hole shape="rect" width={8} height={4} pcbX={0} pcbY={0} />
// </board>

function volume(mesh: OcctMesh) {
  const positions = mesh.attributes.position.array
  const indices = mesh.index.array
  let signedVolume = 0
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = indices
      .slice(i, i + 3)
      .map((index) => positions.slice(index * 3, index * 3 + 3))
    signedVolume +=
      (a[0] * (b[1] * c[2] - b[2] * c[1]) +
        a[1] * (b[2] * c[0] - b[0] * c[2]) +
        a[2] * (b[0] * c[1] - b[1] * c[0])) /
      6
  }
  return Math.abs(signedVolume)
}

test("rectangular mounting holes cut through the exported board", async () => {
  const step = await circuitJsonToStep(circuitJson as CircuitJson)
  const imported = await importStepWithOcct(step)
  expect(imported.success).toBe(true)
  expect(imported.meshes.map((mesh) => mesh.name)).toEqual(["PCB"])
  expect(volume(imported.meshes[0])).toBeCloseTo((20 * 12 - 8 * 4) * 1.6, 4)

  // An 8 x 4 mm opening should be visible in the center of the board.
  await expect(step).toMatchStepSnapshot(
    import.meta.path,
    "rectangular-mounting-hole",
  )

  // The same dimensions must be cut at nonzero coordinates and any thickness.
  for (const thickness of [0.8, 2.4]) {
    const shifted = (circuitJson as CircuitJson).map((item) =>
      item.type === "pcb_board"
        ? { ...item, thickness, center: { x: 3, y: -2 } }
        : item.type === "pcb_hole"
          ? { ...item, x: 5, y: -1 }
          : item,
    )
    for (const exportMode of ["assembly", "pcb"] as const) {
      const exported = await circuitJsonToStep(shifted, { exportMode })
      expect(
        volume((await importStepWithOcct(exported)).meshes[0]),
      ).toBeCloseTo((20 * 12 - 8 * 4) * thickness, 4)
    }
    const panelStep = await circuitJsonToStep([
      ...shifted,
      {
        type: "pcb_panel",
        pcb_panel_id: "panel",
        covered_with_solder_mask: true,
        width: 20,
        height: 12,
        center: { x: 3, y: -2 },
        thickness,
      },
    ])
    expect(volume((await importStepWithOcct(panelStep)).meshes[0])).toBeCloseTo(
      (20 * 12 - 8 * 4) * thickness,
      4,
    )
  }
})
