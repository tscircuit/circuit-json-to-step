import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct, type OcctMesh } from "../../utils/occt/importer"
import circuitJson from "./basics21.json"

test("basics21: panels preserve rails, edge mousebites, cutouts and components", async () => {
  const step = await circuitJsonToStep(circuitJson as CircuitJson)
  const imported = await importStepWithOcct(step)
  expect(imported.root.children[0].children.map((child) => child.name)).toEqual(
    ["PCB Panel", "R1"],
  )
  // Component mesh generation must not create another copy of the panel.
  expect(imported.root.children[0].children[0].meshes).toHaveLength(1)
  expect(imported.root.children[0].children[1].meshes.length).toBeGreaterThan(0)
  const panel = imported.meshes[0]
  for (const [axis, min, max] of [
    [0, 10, 50],
    [1, 0, 20],
    [2, -1, 1],
  ]) {
    const values = panel.attributes.position.array.filter(
      (_, i) => i % 3 === axis,
    )
    expect(Math.min(...values)).toBeCloseTo(min)
    expect(Math.max(...values)).toBeCloseTo(max)
  }
  expect(hasTopSurface(panel, 11, 17)).toBe(false) // Rail mounting hole
  expect(hasTopSurface(panel, 13, 8)).toBe(false) // On a child board's edge
  expect(hasTopSurface(panel, 30, 10)).toBe(false) // Routing slot
  expect(hasTopSurface(panel, 30, 19)).toBe(true) // Rail between boards
  expect(hasTopSurface(panel, 20, 10)).toBe(true) // Board material

  const panelOnly = circuitJson.filter(
    (item) =>
      ![
        "pcb_component",
        "source_component",
        "pcb_board",
        "cad_component",
      ].includes(item.type),
  )
  expect(
    (
      await importStepWithOcct(
        await circuitJsonToStep(panelOnly as CircuitJson),
      )
    ).meshes,
  ).toHaveLength(1)
}, 30_000)

function hasTopSurface(mesh: OcctMesh, x: number, y: number) {
  const positions = mesh.attributes.position.array
  const indices = mesh.index.array
  for (let i = 0; i < indices.length; i += 3) {
    const points = indices
      .slice(i, i + 3)
      .map((index) => positions.slice(index * 3, index * 3 + 3))
    if (points.some((point) => Math.abs(point[2] - 1) > 1e-6)) continue
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
