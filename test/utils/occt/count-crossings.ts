import type { OcctMesh } from "./importer"

// Test boards sit within a few millimeters of z = 0, so start the ray well above.
const rayOriginZ = 10

/**
 * Count triangles a ray straight down through (x, y) passes through. The ray
 * starts above the mesh at z = rayOriginZ. Two means the ray entered and exited
 * material, zero means it passed through empty space, one means it met a single
 * face, indicating an open or malformed solid.
 */
export function countCrossings({
  mesh,
  x,
  y,
}: {
  mesh: OcctMesh
  x: number
  y: number
}): number {
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
    const sz = rayOriginZ - az
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
