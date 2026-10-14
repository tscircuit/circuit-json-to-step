import type { Ref, Repository } from "stepts"
import {
  Axis2Placement3D,
  CartesianPoint,
  Circle,
  Direction,
  EdgeCurve,
  EdgeLoop,
  Line,
  OrientedEdge,
  Vector,
  VertexPoint,
} from "stepts"

/**
 * Shared boundary-segment helpers used by both the pill hole geometry and the
 * cutout geometry. A boundary is a list of straight runs and arcs; each is
 * emitted as an edge between cached vertices so that consecutive segments always
 * meet and every loop closes.
 */

export type BoundarySegment =
  | {
      kind: "arc"
      edge: Ref<EdgeCurve>
      start: Ref<VertexPoint>
      end: Ref<VertexPoint>
      centerX: number
      centerY: number
      refX: number
      refY: number
      radius: number
    }
  | {
      kind: "line"
      edge: Ref<EdgeCurve>
      start: Ref<VertexPoint>
      end: Ref<VertexPoint>
    }

export function rotatePoint(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  angle: number,
): { x: number; y: number } {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = x - centerX
  const dy = y - centerY
  return {
    x: centerX + dx * cos - dy * sin,
    y: centerY + dx * sin + dy * cos,
  }
}

/**
 * Vertices are shared between segments of the same z so that joins do not split
 * into near-duplicate points. Coordinates are rounded to 9 decimals with -0
 * folded to 0, because the same corner can be reached by two different formulas
 * that land either side of zero.
 */
export function createVertexCache(repo: Repository, z: number) {
  const vertices = new Map<string, Ref<VertexPoint>>()
  const normalize = (value: number) => {
    const rounded = Number(value.toFixed(9))
    return Object.is(rounded, -0) ? 0 : rounded
  }

  return (x: number, y: number) => {
    const key = `${normalize(x)},${normalize(y)},${normalize(z)}`
    const existing = vertices.get(key)
    if (existing) return existing

    const vertex = repo.add(
      new VertexPoint("", repo.add(new CartesianPoint("", x, y, z))),
    )
    vertices.set(key, vertex)
    return vertex
  }
}

export function createLineEdge(
  repo: Repository,
  v1: Ref<VertexPoint>,
  v2: Ref<VertexPoint>,
): Ref<EdgeCurve> {
  const p1 = v1.resolve(repo).pnt.resolve(repo)
  const p2 = v2.resolve(repo).pnt.resolve(repo)
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const dz = p2.z - p1.z
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz)

  if (length < 1e-10) {
    const dir = repo.add(new Direction("", 1, 0, 0))
    const vec = repo.add(new Vector("", dir, 1e-10))
    const line = repo.add(new Line("", v1.resolve(repo).pnt, vec))
    return repo.add(new EdgeCurve("", v1, v2, line, true))
  }

  const dir = repo.add(new Direction("", dx / length, dy / length, dz / length))
  const vec = repo.add(new Vector("", dir, length))
  const line = repo.add(new Line("", v1.resolve(repo).pnt, vec))
  return repo.add(new EdgeCurve("", v1, v2, line, true))
}

export function createLineSegment(
  repo: Repository,
  start: { x: number; y: number },
  end: { x: number; y: number },
  getVertex: (x: number, y: number) => Ref<VertexPoint>,
): BoundarySegment {
  const startVertex = getVertex(start.x, start.y)
  const endVertex = getVertex(end.x, end.y)
  return {
    kind: "line",
    edge: createLineEdge(repo, startVertex, endVertex),
    start: startVertex,
    end: endVertex,
  }
}

export function createArcSegment(
  repo: Repository,
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  rotation: number,
  originX: number,
  originY: number,
  z: number,
  getVertex: (x: number, y: number) => Ref<VertexPoint>,
): BoundarySegment {
  const start = rotatePoint(
    centerX + radius * Math.cos(startAngle),
    centerY + radius * Math.sin(startAngle),
    originX,
    originY,
    rotation,
  )
  const end = rotatePoint(
    centerX + radius * Math.cos(endAngle),
    centerY + radius * Math.sin(endAngle),
    originX,
    originY,
    rotation,
  )
  const center = rotatePoint(centerX, centerY, originX, originY, rotation)
  const startVertex = getVertex(start.x, start.y)
  const endVertex = getVertex(end.x, end.y)
  const centerPoint = repo.add(new CartesianPoint("", center.x, center.y, z))
  const normalDir = repo.add(new Direction("", 0, 0, -1))
  const refDir = repo.add(
    new Direction("", Math.cos(rotation), Math.sin(rotation), 0),
  )
  const placement = repo.add(
    new Axis2Placement3D("", centerPoint, normalDir, refDir),
  )
  const circle = repo.add(new Circle("", placement, radius))

  return {
    kind: "arc",
    edge: repo.add(new EdgeCurve("", startVertex, endVertex, circle, false)),
    start: startVertex,
    end: endVertex,
    centerX: center.x,
    centerY: center.y,
    refX: Math.cos(rotation),
    refY: Math.sin(rotation),
    radius,
  }
}
export function createLoopFromSegments(
  repo: Repository,
  segments: BoundarySegment[],
  orientation: boolean,
): Ref<EdgeLoop> {
  return repo.add(
    new EdgeLoop(
      "",
      segments.map((segment) =>
        repo.add(new OrientedEdge("", segment.edge, orientation)),
      ),
    ),
  )
}
