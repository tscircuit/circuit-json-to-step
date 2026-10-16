import { expect, test } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct, type OcctMesh } from "../../utils/occt/importer"
import circuitJson from "./repro05.json"

// Source: sample014-usb-c-power-adapter, from the circuit json dataset.
// 21.9 x 52.5 mm board with seven circular holes, from 0.65 mm to 2.2 mm.

/**
 * Count triangles a ray straight down through (x, y) passes through. Two means
 * the ray entered and exited material, zero means it passed through empty
 * space, one means it met a single face and so met leftover material.
 */
const countCrossings = (mesh: OcctMesh, x: number, y: number): number => {
  const positions = mesh.attributes.position.array
  const indices = mesh.index.array
  let crossings = 0
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i]! * 3
    const b = indices[i + 1]! * 3
    const c = indices[i + 2]! * 3
    const ax = positions[a]!
    const ay = positions[a + 1]!
    const az = positions[a + 2]!
    const bx = positions[b]!
    const by = positions[b + 1]!
    const bz = positions[b + 2]!
    const cx = positions[c]!
    const cy = positions[c + 1]!
    const cz = positions[c + 2]!
    const e1x = bx - ax
    const e1y = by - ay
    const e1z = bz - az
    const e2x = cx - ax
    const e2y = cy - ay
    const e2z = cz - az
    // The ray direction is (0, 0, -1), so the cross product with e2 reduces to
    // (e2y, -e2x, 0).
    const hx = e2y
    const hy = -e2x
    const hz = 0
    const det = e1x * hx + e1y * hy + e1z * hz
    if (Math.abs(det) < 1e-12) continue
    const invDet = 1 / det
    const sx = x - ax
    const sy = y - ay
    const sz = 10 - az
    const u = (sx * hx + sy * hy + sz * hz) * invDet
    if (u < 0 || u > 1) continue
    const qx = sy * e1z - sz * e1y
    const qy = sz * e1x - sx * e1z
    const qz = sx * e1y - sy * e1x
    const v = -qz * invDet
    if (v < 0 || u + v > 1) continue
    const t = (e2x * qx + e2y * qy + e2z * qz) * invDet
    if (t > 0) crossings++
  }
  return crossings
}

test("repro05: circular holes are only half cut in STEP exports", async () => {
  const stepText = await circuitJsonToStep(structuredClone(circuitJson) as any)

  expect(stepText).toContain("ISO-10303-21")
  expect(stepText).toContain("END-ISO-10303-21")
  expect(stepText).toContain("MANIFOLD_SOLID_BREP")

  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)
  expect(occtResult.meshes).toHaveLength(1)
  const board = occtResult.meshes[0]!

  // Every circular hole in the fixture, plated or not, since the drill is cut
  // the same way for both.
  const holes = (circuitJson as any[]).filter(
    (item) => item.type === "pcb_hole" || item.type === "pcb_plated_hole",
  )
  expect(holes).toHaveLength(7)
  expect(holes.filter((hole) => hole.type === "pcb_hole")).toHaveLength(4)
  expect(holes.filter((hole) => hole.type === "pcb_plated_hole")).toHaveLength(
    3,
  )

  // Each circular hole should be open edge to edge, so a ray through its centre
  // should cross nothing at all. These cross once or twice, which is material
  // standing inside the hole. A fix should take them to 0.
  const crossingsAtHoleCentres = holes.map((hole) =>
    countCrossings(board, hole.x, hole.y),
  )
  expect(crossingsAtHoleCentres).toEqual([1, 2, 2, 2, 2, 2, 2])

  // Board material away from the holes is solid, entered and exited.
  expect(countCrossings(board, 6.1, 0.4)).toBe(2)
  expect(countCrossings(board, 0.2, -8.7)).toBe(2)

  // Capture the current output, in which the holes are not fully open, so a fix
  // can update this snapshot.
  await expect(stepText).toMatchStepSnapshot(import.meta.path, "repro05")
})
