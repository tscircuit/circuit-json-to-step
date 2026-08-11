import type { Ref, Repository } from "stepts"
import {
  AdvancedFace,
  Axis2Placement3D,
  CartesianPoint,
  Circle,
  CylindricalSurface,
  Direction,
  EdgeCurve,
  EdgeLoop,
  FaceOuterBound,
  OrientedEdge,
  Plane,
  VertexPoint,
} from "stepts"
import { createEdge } from "./step-brep-utils"

export interface CutoutHoleGeometry {
  bottomLoop: Ref<EdgeLoop>
  topLoop: Ref<EdgeLoop>
  wallFaces: Ref<AdvancedFace>[]
}

type Point = { x: number; y: number }

/**
 * One piece of a cutout's boundary, always traversed counter-clockwise (viewed
 * from +Z) so wall normals can be derived without per-shape special cases.
 */
type BoundarySegment =
  | { kind: "line"; from: Point; to: Point }
  | {
      kind: "arc"
      center: Point
      radius: number
      startAngle: number
      endAngle: number
    }

function segmentStart(segment: BoundarySegment): Point {
  if (segment.kind === "line") return segment.from
  return {
    x: segment.center.x + segment.radius * Math.cos(segment.startAngle),
    y: segment.center.y + segment.radius * Math.sin(segment.startAngle),
  }
}

function segmentEnd(segment: BoundarySegment): Point {
  if (segment.kind === "line") return segment.to
  return {
    x: segment.center.x + segment.radius * Math.cos(segment.endAngle),
    y: segment.center.y + segment.radius * Math.sin(segment.endAngle),
  }
}

/** Counter-clockwise corner points of a polygon cutout, or null if degenerate. */
function getPolygonPoints(points: Point[]): Point[] | null {
  const cleaned = points.filter((point, index) => {
    const next = points[(index + 1) % points.length]!
    return Math.hypot(next.x - point.x, next.y - point.y) > 1e-6
  })
  if (cleaned.length < 3) return null

  let signedArea = 0
  for (let index = 0; index < cleaned.length; index++) {
    const current = cleaned[index]!
    const next = cleaned[(index + 1) % cleaned.length]!
    signedArea += current.x * next.y - next.x * current.y
  }

  return signedArea < 0 ? cleaned.reverse() : cleaned
}

/**
 * Boundary of a rect cutout: four straight sides joined by quarter-arc corners.
 * A `corner_radius` of 0 gives sharp corners and `min(width, height) / 2` gives
 * a fully rounded slot (what the panelizer emits for routed tabs); anything in
 * between collapses the appropriate straight sides to nothing.
 */
function getRectSegments(cutout: any): BoundarySegment[] {
  const center = cutout.center as Point
  const halfWidth = cutout.width / 2
  const halfHeight = cutout.height / 2
  const rotation = ((cutout.rotation ?? 0) * Math.PI) / 180
  const radius = Math.min(
    Math.max(cutout.corner_radius ?? 0, 0),
    halfWidth,
    halfHeight,
  )
  const insetX = halfWidth - radius
  const insetY = halfHeight - radius

  // Right side up, then around counter-clockwise.
  const sides: [Point, Point][] = [
    [
      { x: halfWidth, y: -insetY },
      { x: halfWidth, y: insetY },
    ],
    [
      { x: insetX, y: halfHeight },
      { x: -insetX, y: halfHeight },
    ],
    [
      { x: -halfWidth, y: insetY },
      { x: -halfWidth, y: -insetY },
    ],
    [
      { x: -insetX, y: -halfHeight },
      { x: insetX, y: -halfHeight },
    ],
  ]
  const cornerCenters: Point[] = [
    { x: insetX, y: insetY },
    { x: -insetX, y: insetY },
    { x: -insetX, y: -insetY },
    { x: insetX, y: -insetY },
  ]

  const toWorld = (point: Point) => ({
    x: center.x + point.x * Math.cos(rotation) - point.y * Math.sin(rotation),
    y: center.y + point.x * Math.sin(rotation) + point.y * Math.cos(rotation),
  })

  const segments: BoundarySegment[] = []
  for (let index = 0; index < 4; index++) {
    const [from, to] = sides[index]!
    // Collapses to nothing once the radius eats the whole side.
    if (Math.hypot(to.x - from.x, to.y - from.y) > 1e-9) {
      segments.push({ kind: "line", from: toWorld(from), to: toWorld(to) })
    }
    if (radius > 1e-9) {
      segments.push({
        kind: "arc",
        center: toWorld(cornerCenters[index]!),
        radius,
        startAngle: rotation + (index * Math.PI) / 2,
        endAngle: rotation + ((index + 1) * Math.PI) / 2,
      })
    }
  }

  return segments
}

/**
 * Counter-clockwise boundary of a `pcb_cutout`, or null for shapes this module
 * doesn't build (circle is handled as a cylindrical hole, path isn't emitted by
 * anything in tscircuit yet).
 */
export function getCutoutBoundarySegments(
  cutout: any,
): BoundarySegment[] | null {
  if (cutout.shape === "rect") {
    const segments = getRectSegments(cutout)
    // A zero-width or zero-height rect collapses to a pair of collinear
    // segments, which would build a zero-area hole and an invalid solid.
    return segments.length < 3 ? null : segments
  }

  if (cutout.shape === "polygon") {
    const points = getPolygonPoints((cutout.points ?? []) as Point[])
    if (!points) return null
    return points.map((point, index) => ({
      kind: "line" as const,
      from: point,
      to: points[(index + 1) % points.length]!,
    }))
  }

  return null
}

/**
 * Builds the boundary loops and walls for a hole through the board, matching
 * the shape of the circular/pill hole geometries. Straight segments get planar
 * walls, arcs get cylindrical ones.
 */
export function createHoleGeometryFromSegments(
  repo: Repository,
  segments: BoundarySegment[],
  zMin: number,
  zMax: number,
): CutoutHoleGeometry {
  const zDir = repo.add(new Direction("", 0, 0, 1))
  const xDir = repo.add(new Direction("", 1, 0, 0))

  // Consecutive segments must share a vertex or the loop isn't closed. Corner
  // coordinates are reached by two different formulas, so round before keying
  // and fold -0 into 0 or values either side of zero end up on separate
  // vertices ((-1e-16).toFixed(9) is "-0.000000000").
  const normalize = (value: number) => {
    const rounded = Number(value.toFixed(9))
    return Object.is(rounded, -0) ? 0 : rounded
  }
  const vertexCaches = [zMin, zMax].map((z) => {
    const cache = new Map<string, Ref<VertexPoint>>()
    return (point: Point) => {
      const key = `${normalize(point.x)},${normalize(point.y)}`
      const existing = cache.get(key)
      if (existing) return existing
      const vertex = repo.add(
        new VertexPoint(
          "",
          repo.add(new CartesianPoint("", point.x, point.y, z)),
        ),
      )
      cache.set(key, vertex)
      return vertex
    }
  })

  const createSegmentEdge = (
    segment: BoundarySegment,
    z: number,
    getVertex: (point: Point) => Ref<VertexPoint>,
  ): Ref<EdgeCurve> => {
    const start = getVertex(segmentStart(segment))
    const end = getVertex(segmentEnd(segment))
    if (segment.kind === "line") return createEdge(repo, start, end)

    // +Z normal makes the circle run counter-clockwise, matching the boundary.
    const placement = repo.add(
      new Axis2Placement3D(
        "",
        repo.add(new CartesianPoint("", segment.center.x, segment.center.y, z)),
        zDir,
        xDir,
      ),
    )
    const circle = repo.add(new Circle("", placement, segment.radius))
    return repo.add(new EdgeCurve("", start, end, circle, true))
  }

  const bottomEdges = segments.map((segment) =>
    createSegmentEdge(segment, zMin, vertexCaches[0]!),
  )
  const topEdges = segments.map((segment) =>
    createSegmentEdge(segment, zMax, vertexCaches[1]!),
  )
  const verticalEdges = segments.map((segment) =>
    createEdge(
      repo,
      vertexCaches[0]!(segmentStart(segment)),
      vertexCaches[1]!(segmentStart(segment)),
    ),
  )

  const bottomLoop = repo.add(
    new EdgeLoop(
      "",
      bottomEdges.map((edge) => repo.add(new OrientedEdge("", edge, true))),
    ),
  )
  const topLoop = repo.add(
    new EdgeLoop(
      "",
      topEdges.map((edge) => repo.add(new OrientedEdge("", edge, true))),
    ),
  )

  const wallFaces: Ref<AdvancedFace>[] = []
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index]!
    const next = (index + 1) % segments.length
    const loop = repo.add(
      new EdgeLoop("", [
        repo.add(new OrientedEdge("", bottomEdges[index]!, true)),
        repo.add(new OrientedEdge("", verticalEdges[next]!, true)),
        repo.add(new OrientedEdge("", topEdges[index]!, false)),
        repo.add(new OrientedEdge("", verticalEdges[index]!, false)),
      ]),
    )

    if (segment.kind === "arc") {
      const placement = repo.add(
        new Axis2Placement3D(
          "",
          repo.add(
            new CartesianPoint("", segment.center.x, segment.center.y, zMin),
          ),
          zDir,
          xDir,
        ),
      )
      const surface = repo.add(
        new CylindricalSurface("", placement, segment.radius),
      )
      // sameSense false so the wall normal faces into the hole, as drilled
      // holes do.
      wallFaces.push(
        repo.add(
          new AdvancedFace(
            "",
            [repo.add(new FaceOuterBound("", loop, true))],
            surface,
            false,
          ),
        ),
      )
      continue
    }

    const dx = segment.to.x - segment.from.x
    const dy = segment.to.y - segment.from.y
    const length = Math.hypot(dx, dy)
    // Segments run CCW, so the wall normal must point inwards (into the hole).
    const placement = repo.add(
      new Axis2Placement3D(
        "",
        vertexCaches[0]!(segment.from).resolve(repo).pnt,
        repo.add(new Direction("", -dy / length, dx / length, 0)),
        repo.add(new Direction("", dx / length, dy / length, 0)),
      ),
    )
    wallFaces.push(
      repo.add(
        new AdvancedFace(
          "",
          [repo.add(new FaceOuterBound("", loop, true))],
          repo.add(new Plane("", placement)),
          true,
        ),
      ),
    )
  }

  return { bottomLoop, topLoop, wallFaces }
}
