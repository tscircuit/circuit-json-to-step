import { expect } from "bun:test"

/**
 * True if (x, y) is covered by a triangle of the mesh lying on the plane z.
 * Used to assert that a cutout really pierces the board's top/bottom faces
 * rather than only checking which entities the STEP text mentions.
 */
export function isCoveredAtZ(
  positions: number[],
  indices: number[],
  z: number,
  x: number,
  y: number,
) {
  const sign = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
  ) => (ax - cx) * (by - cy) - (bx - cx) * (ay - cy)

  for (let i = 0; i < indices.length; i += 3) {
    const p = [0, 1, 2].map((k) => {
      const base = indices[i + k]! * 3
      return [positions[base]!, positions[base + 1]!, positions[base + 2]!]
    })
    if (p.some((point) => Math.abs(point[2]! - z) > 1e-6)) continue

    const d1 = sign(x, y, p[0]![0]!, p[0]![1]!, p[1]![0]!, p[1]![1]!)
    const d2 = sign(x, y, p[1]![0]!, p[1]![1]!, p[2]![0]!, p[2]![1]!)
    const d3 = sign(x, y, p[2]![0]!, p[2]![1]!, p[0]![0]!, p[0]![1]!)
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0
    if (!(hasNeg && hasPos)) return true
  }
  return false
}

/**
 * Asserts, via `expect`, that each point is/isn't covered on both board faces.
 * Points are reported alongside the result so a failure names the offender.
 */
export function expectFaceCoverage(
  mesh: { positions: number[]; indices: number[]; zTop: number },
  points: [number, number][],
  covered: boolean,
) {
  for (const z of [mesh.zTop, -mesh.zTop]) {
    for (const [x, y] of points) {
      expect([
        z,
        x,
        y,
        isCoveredAtZ(mesh.positions, mesh.indices, z, x, y),
      ]).toEqual([z, x, y, covered])
    }
  }
}
