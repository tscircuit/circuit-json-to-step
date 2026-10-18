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

/** Cache key for a vertex looked up by rounded position, so two arcs that meet
 * at the same point share one VertexPoint instead of emitting a duplicate. */
type CachedVertexKey = string

/** Cache key pairing the two vertices a vertical wall edge connects. */
type VerticalEdgeKey = string

/**
 * Arcs used to approximate a full circle.
 *
 * Two semicircles are enough, because a semicircle is exact. The count does not
 * buy accuracy: occt tessellates each arc at its own fixed deflection, so the
 * emitted boundary is subdivided the same way whether this is 2 or 24, and the
 * wall faces and loop edges are what scale with it.
 */
export const fullCircleSegments = 2

export interface PillGeometry {
  centerX: number
  centerY: number
  width: number
  height: number
  ccwRotationRadians: number
  radius: number
  straightHalfLength: number
  isHorizontal: boolean
}

export type PillBoundarySegment =
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

export interface PillHoleGeometry {
  bottomLoop: Ref<EdgeLoop>
  topLoop: Ref<EdgeLoop>
  wallFaces: Ref<AdvancedFace>[]
}

/** The pill fields getPillGeometry reads, loosened from the circuit json schema
 * because a coordinate is typed number | { value } and the drill offset only
 * exists on the plated pad variants. */
export interface PillHole {
  x?: number | { value: number }
  y?: number | { value: number }
  hole_width?: number
  hole_height?: number
  hole_offset_x?: number
  hole_offset_y?: number
  hole_ccw_rotation?: number
  ccw_rotation?: number
}

function coordinateOf(
  coordinate: number | { value: number } | undefined,
): number {
  if (typeof coordinate === "number") return coordinate
  return coordinate?.value ?? 0
}

export function getPillGeometry(hole: PillHole): PillGeometry {
  const offsetX = hole.hole_offset_x ?? 0
  const offsetY = hole.hole_offset_y ?? 0
  const centerX = coordinateOf(hole.x) + offsetX
  const centerY = coordinateOf(hole.y) + offsetY
  // A pill hole carries both dimensions by definition, so a missing one means
  // the record is malformed. The old signature took `hole: any` and read these
  // untyped, which produced NaN geometry instead of failing; circuit json only
  // types them as optional because it has to cover pcb_hole and its variants
  // in one union. Every caller routes here on hole_shape "pill" or "rotated_pill",
  // which always carries both, so this throw should be unreachable in practice
  // and exists to keep the type honest rather than to handle a known case.
  if (hole.hole_width === undefined || hole.hole_height === undefined) {
    throw new Error("pill hole requires hole_width and hole_height")
  }
  const width = hole.hole_width
  const height = hole.hole_height
  // rotated_pill_hole_with_rect_pad names this hole_ccw_rotation; the oval and
  // polygon pad variants name it ccw_rotation.
  const ccwRotation = hole.hole_ccw_rotation ?? hole.ccw_rotation ?? 0
  const ccwRotationRadians = (ccwRotation * Math.PI) / 180
  const isHorizontal = width >= height
  const radius = Math.min(width, height) / 2
  const straightHalfLength = Math.abs(width - height) / 2

  return {
    centerX,
    centerY,
    width,
    height,
    ccwRotationRadians,
    radius,
    straightHalfLength,
    isHorizontal,
  }
}

export function rotatePoint({
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

export function createVertexCache(repo: Repository, z: number) {
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

function createLineSegment(
  repo: Repository,
  start: { x: number; y: number },
  end: { x: number; y: number },
  getVertex: (x: number, y: number) => Ref<VertexPoint>,
): PillBoundarySegment {
  const startVertex = getVertex(start.x, start.y)
  const endVertex = getVertex(end.x, end.y)
  return {
    kind: "line",
    edge: createLineEdge(repo, startVertex, endVertex),
    start: startVertex,
    end: endVertex,
  }
}

export function createArcSegment({
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

function createPillBoundarySegments(
  repo: Repository,
  hole: PillHole,
  z: number,
): PillBoundarySegment[] {
  const geom = getPillGeometry(hole)
  const {
    centerX,
    centerY,
    radius,
    straightHalfLength,
    ccwRotationRadians,
    isHorizontal,
  } = geom
  const capOffset = straightHalfLength
  const getVertex = createVertexCache(repo, z)

  if (isHorizontal) {
    return [
      createArcSegment({
        repo,
        centerX: centerX + capOffset,
        centerY,
        z,
        radius,
        startAngle: -Math.PI / 2,
        endAngle: Math.PI / 2,
        ccwRotationRadians,
        rotationCenterX: centerX,
        rotationCenterY: centerY,
        getVertex,
      }),
      createLineSegment(
        repo,
        rotatePoint({
          x: centerX + capOffset,
          y: centerY - radius,
          centerX,
          centerY,
          ccwRotationRadians,
        }),
        rotatePoint({
          x: centerX - capOffset,
          y: centerY - radius,
          centerX,
          centerY,
          ccwRotationRadians,
        }),
        getVertex,
      ),
      createArcSegment({
        repo,
        centerX: centerX - capOffset,
        centerY,
        z,
        radius,
        startAngle: Math.PI / 2,
        endAngle: (3 * Math.PI) / 2,
        ccwRotationRadians,
        rotationCenterX: centerX,
        rotationCenterY: centerY,
        getVertex,
      }),
      createLineSegment(
        repo,
        rotatePoint({
          x: centerX - capOffset,
          y: centerY + radius,
          centerX,
          centerY,
          ccwRotationRadians,
        }),
        rotatePoint({
          x: centerX + capOffset,
          y: centerY + radius,
          centerX,
          centerY,
          ccwRotationRadians,
        }),
        getVertex,
      ),
    ]
  }

  return [
    createArcSegment({
      repo,
      centerX,
      centerY: centerY - capOffset,
      z,
      radius,
      startAngle: Math.PI,
      endAngle: 0,
      ccwRotationRadians,
      rotationCenterX: centerX,
      rotationCenterY: centerY,
      getVertex,
    }),
    createLineSegment(
      repo,
      rotatePoint({
        x: centerX + radius,
        y: centerY - capOffset,
        centerX,
        centerY,
        ccwRotationRadians,
      }),
      rotatePoint({
        x: centerX + radius,
        y: centerY + capOffset,
        centerX,
        centerY,
        ccwRotationRadians,
      }),
      getVertex,
    ),
    createArcSegment({
      repo,
      centerX,
      centerY: centerY + capOffset,
      z,
      radius,
      startAngle: 0,
      endAngle: Math.PI,
      ccwRotationRadians,
      rotationCenterX: centerX,
      rotationCenterY: centerY,
      getVertex,
    }),
    createLineSegment(
      repo,
      rotatePoint({
        x: centerX - radius,
        y: centerY + capOffset,
        centerX,
        centerY,
        ccwRotationRadians,
      }),
      rotatePoint({
        x: centerX - radius,
        y: centerY - capOffset,
        centerX,
        centerY,
        ccwRotationRadians,
      }),
      getVertex,
    ),
  ]
}

/**
 * Build a closed loop from a boundary. Setting `reversed` flips the traversal
 * direction of every edge, which also requires visiting them in reverse order:
 * flipping orientation alone leaves the chain walking away from where it just
 * came, so the loop comes out disconnected.
 */
export function createLoopFromSegments({
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

export function createPillHoleGeometry(
  repo: Repository,
  hole: PillHole,
  zMin: number,
  zMax: number,
  zDir: Ref<Direction>,
): PillHoleGeometry {
  const bottomSegments = createPillBoundarySegments(repo, hole, zMin)
  const topSegments = createPillBoundarySegments(repo, hole, zMax)
  const bottomLoop = createLoopFromSegments({ repo, segments: bottomSegments })
  const topLoop = createLoopFromSegments({ repo, segments: topSegments })
  const wallFaces = createWallFaces({
    repo,
    bottomSegments,
    topSegments,
    zMin,
    zDir,
  })
  return { bottomLoop, topLoop, wallFaces }
}

/** Sweep a boundary between two z planes; each segment becomes one wall face. */
export function createWallFaces({
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
