import { expect, test } from "bun:test"
import { circuitJsonToStep } from "../lib"
import { importStepWithOcct } from "./utils/occt/importer"
import fixture from "./fixtures/circular-hole-removal.json"

/**
 * A circular hole used to be emitted as a single CIRCLE edge bounding one
 * cylindrical wall face, trimmed by a single seam edge. That wall was only half
 * cut, so material survived inside every circular hole. This guards the fix: the
 * hole boundary is built from arcs, and a ray dropped through the hole centre
 * must find empty space.
 */

/** Count triangles a ray straight down through (x, y) passes through. */
const countCrossings = (mesh: any, x: number, y: number): number => {
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
    // direction is (0, 0, -1), so the cross product with e2 reduces to this
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

test("circular hole removes material through its full diameter", async () => {
  const stepText = await circuitJsonToStep(fixture as any)

  expect(stepText).toContain("MANIFOLD_SOLID_BREP")

  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)
  expect(occtResult.meshes).toHaveLength(1)

  const board = occtResult.meshes[0] as any

  // The hole centre must be empty space.
  expect(countCrossings(board, 0, 0)).toBe(0)

  // Just inside the hole wall must be empty too, otherwise the hole is only
  // partly cut.
  expect(countCrossings(board, 2.6, 0)).toBe(0)
  expect(countCrossings(board, 0, -2.6)).toBe(0)

  // Material away from the hole must still be solid, entered and exited.
  expect(countCrossings(board, 12.37, 7.91)).toBe(2)
  expect(countCrossings(board, -14.23, -3.67)).toBe(2)
})
