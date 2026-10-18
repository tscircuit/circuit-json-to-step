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
  Line,
  OrientedEdge,
  Plane,
  Vector,
  VertexPoint,
} from "stepts"

/**
 * Cache key for a vertex looked up by rounded position, so two arcs that meet at
 * the same point share one VertexPoint instead of emitting a duplicate.
 */
type CachedVertexKey = string

/** Cache key pairing the two vertices a vertical wall edge connects. */
type VerticalEdgeKey = string

type PillBoundarySegment =
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

function rotatePoint({
  x,
  y,
  centerX,
  centerY,
  ccwRotationRadians,
}: {
  x: number
  y: number
  centerX: number
  centerY: number
  ccwRotationRadians: number
}): { x: number; y: number } {
  const cos = Math.cos(ccwRotationRadians)
  const sin = Math.sin(ccwRotationRadians)
  const dx = x - centerX
  const dy = y - centerY
  return {
    x: centerX + dx * cos - dy * sin,
    y: centerY + dx * sin + dy * cos,
  }
}

/**
 * Arcs used to approximate a full circle.
 *
 * Two semicircles are enough, because a semicircle is exact. The count does not
 * buy accuracy: occt tessellates each arc at its own fixed deflection, so the
 * emitted boundary is subdivided the same way whether this is 2 or 24, and the
 * wall faces and loop edges are what scale with it.
 */
const fullCircleSegments = 2

function createLineEdge(
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

  // Handle zero-length edges (duplicate vertices)
  if (length < 1e-10) {
    // Use arbitrary direction for degenerate edge
    const dir = repo.add(new Direction("", 1, 0, 0))
    const vec = repo.add(new Vector("", dir, 1e-10))
    const line = repo.add(new Line("", v1.resolve(repo).pnt, vec))
    return repo.add(new EdgeCurve("", v1, v2, line, true))
  }

  // Direction must be normalized (unit vector)
  const dir = repo.add(new Direction("", dx / length, dy / length, dz / length))
  // Vector magnitude is the actual edge length
  const vec = repo.add(new Vector("", dir, length))
  const line = repo.add(new Line("", v1.resolve(repo).pnt, vec))
  return repo.add(new EdgeCurve("", v1, v2, line, true))
}

function createVertexAt(
  repo: Repository,
  x: number,
  y: number,
  z: number,
): Ref<VertexPoint> {
  return repo.add(
    new VertexPoint("", repo.add(new CartesianPoint("", x, y, z))),
  )
}

function createVertexCache(repo: Repository, z: number) {
  const vertices = new Map<CachedVertexKey, Ref<VertexPoint>>()
  const normalize = (coordinate: number) => {
    const rounded = Number(coordinate.toFixed(9))
    return Object.is(rounded, -0) ? 0 : rounded
  }

  return (x: number, y: number) => {
    const key = `${normalize(x)},${normalize(y)},${normalize(z)}`
    const existing = vertices.get(key)
    if (existing) return existing

    const vertex = createVertexAt(repo, x, y, z)
    vertices.set(key, vertex)
    return vertex
  }
}

function createArcSegment({
  repo,
  centerX,
  centerY,
  z,
  radius,
  startAngle,
  endAngle,
  ccwRotationRadians,
  rotationCenterX,
  rotationCenterY,
  getVertex,
}: {
  repo: Repository
  centerX: number
  centerY: number
  z: number
  radius: number
  startAngle: number
  endAngle: number
  ccwRotationRadians: number
  rotationCenterX: number
  rotationCenterY: number
  getVertex: (x: number, y: number) => Ref<VertexPoint>
}): PillBoundarySegment {
  const start = rotatePoint({
    x: centerX + radius * Math.cos(startAngle),
    y: centerY + radius * Math.sin(startAngle),
    centerX: rotationCenterX,
    centerY: rotationCenterY,
    ccwRotationRadians,
  })
  const end = rotatePoint({
    x: centerX + radius * Math.cos(endAngle),
    y: centerY + radius * Math.sin(endAngle),
    centerX: rotationCenterX,
    centerY: rotationCenterY,
    ccwRotationRadians,
  })
  const center = rotatePoint({
    x: centerX,
    y: centerY,
    centerX: rotationCenterX,
    centerY: rotationCenterY,
    ccwRotationRadians,
  })
  const startVertex = getVertex(start.x, start.y)
  const endVertex = getVertex(end.x, end.y)
  const centerPoint = repo.add(new CartesianPoint("", center.x, center.y, z))
  const normalDir = repo.add(new Direction("", 0, 0, -1))
  const refDir = repo.add(
    new Direction(
      "",
      Math.cos(ccwRotationRadians),
      Math.sin(ccwRotationRadians),
      0,
    ),
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
    refX: Math.cos(ccwRotationRadians),
    refY: Math.sin(ccwRotationRadians),
    radius,
  }
}

function createLoopFromSegments({
  repo,
  segments,
  reversed = false,
}: {
  repo: Repository
  segments: PillBoundarySegment[]
  reversed?: boolean
}): Ref<EdgeLoop> {
  const ordered = reversed ? [...segments].reverse() : segments
  return repo.add(
    new EdgeLoop(
      "",
      ordered.map((segment) =>
        repo.add(new OrientedEdge("", segment.edge, !reversed)),
      ),
    ),
  )
}

function createWallFaces({
  repo,
  bottomSegments,
  topSegments,
  zMin,
  zDir,
}: {
  repo: Repository
  bottomSegments: PillBoundarySegment[]
  topSegments: PillBoundarySegment[]
  zMin: number
  zDir: Ref<Direction>
}): Ref<AdvancedFace>[] {
  const wallFaces: Ref<AdvancedFace>[] = []
  const verticalEdges = new Map<VerticalEdgeKey, Ref<EdgeCurve>>()
  const getVerticalEdge = (
    bottomVertex: Ref<VertexPoint>,
    topVertex: Ref<VertexPoint>,
  ) => {
    const key = `${bottomVertex.id}:${topVertex.id}`
    const existing = verticalEdges.get(key)
    if (existing) return existing

    const edge = createLineEdge(repo, bottomVertex, topVertex)
    verticalEdges.set(key, edge)
    return edge
  }

  for (let i = 0; i < bottomSegments.length; i++) {
    const bottomSegment = bottomSegments[i]!
    const topSegment = topSegments[i]!
    const startVertical = getVerticalEdge(bottomSegment.start, topSegment.start)
    const endVertical = getVerticalEdge(bottomSegment.end, topSegment.end)
    const loop = repo.add(
      new EdgeLoop("", [
        repo.add(new OrientedEdge("", bottomSegment.edge, true)),
        repo.add(new OrientedEdge("", endVertical, true)),
        repo.add(new OrientedEdge("", topSegment.edge, false)),
        repo.add(new OrientedEdge("", startVertical, false)),
      ]),
    )

    if (bottomSegment.kind === "arc") {
      const bottomCenter = repo.add(
        new CartesianPoint(
          "",
          bottomSegment.centerX,
          bottomSegment.centerY,
          zMin,
        ),
      )
      const refDir = repo.add(
        new Direction("", bottomSegment.refX, bottomSegment.refY, 0),
      )
      const cylinderPlacement = repo.add(
        new Axis2Placement3D("", bottomCenter, zDir, refDir),
      )
      const cylinderSurface = repo.add(
        new CylindricalSurface("", cylinderPlacement, bottomSegment.radius),
      )
      wallFaces.push(
        repo.add(
          new AdvancedFace(
            "",
            [repo.add(new FaceOuterBound("", loop, true))],
            cylinderSurface,
            false,
          ),
        ),
      )
      continue
    }

    const startPoint = bottomSegment.start.resolve(repo).pnt.resolve(repo)
    const endPoint = bottomSegment.end.resolve(repo).pnt.resolve(repo)
    const dx = endPoint.x - startPoint.x
    const dy = endPoint.y - startPoint.y
    const edgeLength = Math.sqrt(dx * dx + dy * dy)
    const normalDir = repo.add(
      new Direction("", dy / edgeLength, -dx / edgeLength, 0),
    )
    const refDir = repo.add(
      new Direction("", dx / edgeLength, dy / edgeLength, 0),
    )
    const placement = repo.add(
      new Axis2Placement3D(
        "",
        bottomSegment.start.resolve(repo).pnt,
        normalDir,
        refDir,
      ),
    )
    const plane = repo.add(new Plane("", placement))
    wallFaces.push(
      repo.add(
        new AdvancedFace(
          "",
          [repo.add(new FaceOuterBound("", loop, true))],
          plane,
          true,
        ),
      ),
    )
  }

  return wallFaces
}

/** A circular hole boundary spanning the board: the loops for its two faces and
 * the walls joining them. */
interface CircularHoleGeometry {
  bottomLoop: Ref<EdgeLoop>
  topLoop: Ref<EdgeLoop>
  wallFaces: Ref<AdvancedFace>[]
}

/** The circular fields of a pcb_hole or pcb_plated_hole, loosened from the
 * schema because circuit json types a coordinate as number | { value } and the
 * drill offset is only present on the plated pad variants. */
interface CircularHole {
  x?: number | { value: number }
  y?: number | { value: number }
  hole_diameter?: number
  hole_offset_x?: number
  hole_offset_y?: number
}

function coordinateOf(
  coordinate: number | { value: number } | undefined,
): number {
  if (typeof coordinate === "number") return coordinate
  return coordinate?.value ?? 0
}

/**
 * A circular hole boundary, built from arc segments.
 *
 * A single closed CIRCLE edge cannot bound a full hole: occt meshes a full
 * cylindrical face by fanning interior triangles from the seam across the
 * opening, so those triangles span the hole and only part of its volume is
 * removed. Segmenting the circle sidesteps that construction.
 *
 * Returns null when the hole has no usable diameter, so a malformed record is
 * skipped rather than emitting degenerate geometry.
 */
export function createCircularHoleGeometry({
  repo,
  hole,
  zMin,
  zMax,
  zDir,
}: {
  repo: Repository
  hole: CircularHole
  zMin: number
  zMax: number
  zDir: Ref<Direction>
}): CircularHoleGeometry | null {
  const diameter = hole.hole_diameter
  if (
    typeof diameter !== "number" ||
    !Number.isFinite(diameter) ||
    diameter <= 0
  ) {
    return null
  }

  const holeX = coordinateOf(hole.x) + (hole.hole_offset_x ?? 0)
  const holeY = coordinateOf(hole.y) + (hole.hole_offset_y ?? 0)
  const radius = diameter / 2

  const createBoundary = (z: number): PillBoundarySegment[] => {
    const getVertex = createVertexCache(repo, z)
    const segments: PillBoundarySegment[] = []
    for (let i = 0; i < fullCircleSegments; i++) {
      segments.push(
        createArcSegment({
          repo,
          centerX: holeX,
          centerY: holeY,
          z,
          radius,
          startAngle: (i / fullCircleSegments) * Math.PI * 2,
          endAngle: ((i + 1) / fullCircleSegments) * Math.PI * 2,
          ccwRotationRadians: 0,
          rotationCenterX: holeX,
          rotationCenterY: holeY,
          getVertex,
        }),
      )
    }
    return segments
  }

  const bottomSegments = createBoundary(zMin)
  const topSegments = createBoundary(zMax)

  return {
    bottomLoop: createLoopFromSegments({
      repo,
      segments: bottomSegments,
      reversed: true,
    }),
    topLoop: createLoopFromSegments({ repo, segments: topSegments }),
    wallFaces: createWallFaces({
      repo,
      bottomSegments,
      topSegments,
      zMin,
      zDir,
    }),
  }
}
