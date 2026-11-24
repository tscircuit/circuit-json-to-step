import { expect } from "bun:test"
import {
  FaceOuterBound,
  ManifoldSolidBrep,
  Plane,
  parseRepository,
} from "stepts"

/** Inspect the exported topology before any CAD reader can repair it. */
export function inspectBoardCaps(step: string) {
  const repo = parseRepository(step)
  const solid = repo
    .entries()
    .map(([, entity]) => entity)
    .find(
      (entity): entity is ManifoldSolidBrep =>
        entity instanceof ManifoldSolidBrep,
    )!
  expect(solid).toBeDefined()
  const faces = solid.outer.resolve(repo).faces.map((ref) => ref.resolve(repo))
  const edgeUses = new Map<number, boolean[]>()
  const caps = []
  for (const face of faces) {
    const surface = face.surface.resolve(repo)
    for (const boundRef of face.bounds) {
      const bound = boundRef.resolve(repo)
      const loop = bound.bound.resolve(repo)
      const ordered = bound.sameSense ? loop.edges : [...loop.edges].reverse()
      const edges = ordered.map((ref) => {
        const oriented = ref.resolve(repo)
        const edge = oriented.edge.resolve(repo)
        const forward = oriented.orientation === bound.sameSense
        const uses = edgeUses.get(oriented.edge.id) ?? []
        uses.push(forward)
        edgeUses.set(oriented.edge.id, uses)
        return {
          id: oriented.edge.id,
          start: forward ? edge.start : edge.end,
          end: forward ? edge.end : edge.start,
        }
      })
      for (let i = 0; i < edges.length; i++) {
        expect(edges[i].end.id).toBe(edges[(i + 1) % edges.length].start.id)
      }
      if (!(bound instanceof FaceOuterBound) || !(surface instanceof Plane))
        continue
      const axisZ = surface.placement.resolve(repo).axis?.resolve(repo).dz ?? 1
      const normalZ = axisZ * (face.sameSense ? 1 : -1)
      if (Math.abs(normalZ) !== 1) continue
      const points = edges.map(({ start }) => {
        const point = start.resolve(repo).pnt.resolve(repo)
        return { x: point.x, y: point.y, z: point.z }
      })
      const signedArea =
        points.reduce((sum, p, i) => {
          const next = points[(i + 1) % points.length]
          return sum + p.x * next.y - next.x * p.y
        }, 0) / 2
      caps.push({
        normalZ,
        signedArea,
        points,
        edgeIds: edges.map(({ id }) => id),
      })
    }
  }
  expect(caps).toHaveLength(2)
  for (const uses of edgeUses.values()) expect(uses).toHaveLength(2)
  // Count cap perimeter edges traversed the same way by both adjacent faces.
  const inconsistentEdges = caps
    .flatMap((cap) => cap.edgeIds)
    .filter((id) => {
      const uses = edgeUses.get(id)!
      return uses[0] === uses[1]
    }).length
  return { caps: caps.sort((a, b) => b.normalZ - a.normalZ), inconsistentEdges }
}
