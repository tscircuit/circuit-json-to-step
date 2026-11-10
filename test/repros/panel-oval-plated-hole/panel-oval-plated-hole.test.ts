import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib"
import { importStepWithOcct, type OcctMesh } from "../../utils/occt/importer"
import circuitJson from "./panel-oval-plated-hole.json"

// Fixture generated with @tscircuit/core@0.0.2330 from:
// <panel width="60mm" height="30mm" layoutMode="grid">
//   <board width="20mm" height="12mm" thickness="1.6mm">
//     <platedhole shape="oval" outerWidth="5mm" outerHeight="3mm"
//       holeWidth="3mm" holeHeight="1mm" pcbX={0} pcbY={0} />
//   </board>
//   <board width="20mm" height="12mm" thickness="1.6mm">
//     <platedhole shape="oval" outerWidth="5mm" outerHeight="3mm"
//       holeWidth="3mm" holeHeight="1mm" pcbX={0} pcbY={0} pcbRotation={90} />
//   </board>
// </panel>
// The boards land at x = -11 and x = 11. The oval plated holes carry
// `shape: "oval"` and no `hole_shape`.

const THICKNESS = 1.6

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

function hasTopSurface(mesh: OcctMesh, x: number, y: number) {
  const positions = mesh.attributes.position.array
  const indices = mesh.index.array
  for (let i = 0; i < indices.length; i += 3) {
    const points = indices
      .slice(i, i + 3)
      .map((index) => positions.slice(index * 3, index * 3 + 3))
    if (points.some((point) => Math.abs(point[2] - THICKNESS / 2) > 1e-6))
      continue
    const signs = points.map((point, j) => {
      const next = points[(j + 1) % 3]
      return (
        (x - point[0]) * (next[1] - point[1]) -
        (y - point[1]) * (next[0] - point[0])
      )
    })
    if (
      signs.every((value) => value >= -1e-6) ||
      signs.every((value) => value <= 1e-6)
    )
      return true
  }
  return false
}

test("panels cut oval plated hole slots", async () => {
  const step = await circuitJsonToStep(circuitJson as CircuitJson)
  const imported = await importStepWithOcct(step)
  expect(imported.success).toBe(true)
  expect(imported.meshes.map((mesh) => mesh.name)).toEqual(["PCB Panel"])
  const panel = imported.meshes[0]

  // Each drill is a 3 x 1 mm slot: a 2 x 1 mm rectangle plus two half circles.
  const slotArea = 2 * 1 + Math.PI * 0.5 ** 2
  expect(volume(panel)).toBeCloseTo((60 * 30 - 2 * slotArea) * THICKNESS, 1)

  // Left board: the slot runs along x.
  expect(hasTopSurface(panel, -11, 0)).toBe(false)
  expect(hasTopSurface(panel, -9.8, 0)).toBe(false)
  expect(hasTopSurface(panel, -11, 1.2)).toBe(true)
  // Right board: ccw_rotation 90 turns the slot to run along y.
  expect(hasTopSurface(panel, 11, 0)).toBe(false)
  expect(hasTopSurface(panel, 11, 1.2)).toBe(false)
  expect(hasTopSurface(panel, 12.2, 0)).toBe(true)
  // Only the drill is cut, not the 5 x 3 mm copper pad around it.
  expect(hasTopSurface(panel, -8.8, 0)).toBe(true)

  await expect(step).toMatchStepSnapshot(
    import.meta.path,
    "panel-oval-plated-hole",
  )
}, 30_000)
