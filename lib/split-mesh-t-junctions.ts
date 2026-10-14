import type { Point3, Triangle } from "./scene-geometry"

const EPSILON = 1e-7
const axes = ["x", "y", "z"] as const
const vertexKey = (point: Point3) =>
  axes.map((axis) => point[axis].toFixed(9)).join(":")

/** Split edges at existing mesh vertices so adjacent faces share complete edges. */
export function splitMeshTJunctions(triangles: Triangle[]) {
  const unique = new Map<string, Point3>()
  for (const triangle of triangles)
    for (const vertex of triangle.vertices)
      unique.set(vertexKey(vertex), vertex)
  const vertices = [...unique.values()]
  const sorted = axes.map((axis) =>
    [...vertices].sort((a, b) => a[axis] - b[axis]),
  )
  const edgePoints = new Map<string, Point3[]>()

  const splitEdge = (a: Point3, b: Point3): Point3[] => {
    const aKey = vertexKey(a)
    const bKey = vertexKey(b)
    const key = aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`
    const cached = edgePoints.get(key)
    if (cached) return aKey < bKey ? cached : [...cached].reverse()

    // Query the narrowest coordinate range instead of scanning every vertex
    // for every edge. Panels can contain tens of thousands of drill vertices.
    const ranges = axes.map((axis, i) => {
      const points = sorted[i]
      const start = lowerBound(
        points,
        axis,
        Math.min(a[axis], b[axis]) - EPSILON,
      )
      const end = lowerBound(points, axis, Math.max(a[axis], b[axis]) + EPSILON)
      return { points, start, end }
    })
    const range = ranges.reduce((best, next) =>
      next.end - next.start < best.end - best.start ? next : best,
    )
    const dx = b.x - a.x,
      dy = b.y - a.y,
      dz = b.z - a.z
    const lengthSquared = dx * dx + dy * dy + dz * dz
    const points: { t: number; point: Point3 }[] = []
    if (lengthSquared > EPSILON * EPSILON) {
      for (let i = range.start; i < range.end; i++) {
        const point = range.points[i]
        const px = point.x - a.x,
          py = point.y - a.y,
          pz = point.z - a.z
        const t = (px * dx + py * dy + pz * dz) / lengthSquared
        if (t <= EPSILON || t >= 1 - EPSILON) continue
        const distanceSquared =
          (px - t * dx) ** 2 + (py - t * dy) ** 2 + (pz - t * dz) ** 2
        if (distanceSquared <= EPSILON * EPSILON) points.push({ t, point })
      }
    }
    const result = points.sort((p, q) => p.t - q.t).map(({ point }) => point)
    edgePoints.set(key, aKey < bKey ? result : [...result].reverse())
    return result
  }

  return triangles.map((triangle) => ({
    ...triangle,
    vertices: triangle.vertices.flatMap((vertex, i) => [
      vertex,
      ...splitEdge(vertex, triangle.vertices[(i + 1) % 3]),
    ]),
  }))
}

function lowerBound(points: Point3[], axis: keyof Point3, value: number) {
  let low = 0,
    high = points.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (points[middle][axis] < value) low = middle + 1
    else high = middle
  }
  return low
}
