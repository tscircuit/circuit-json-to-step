import type { Ref, Repository } from "stepts"
import {
  AdvancedFace,
  Axis2Placement3D,
  CartesianPoint,
  CylindricalSurface,
  Direction,
  EdgeCurve,
  EdgeLoop,
  FaceOuterBound,
  OrientedEdge,
  Plane,
  VertexPoint,
} from "stepts"
import {
  createArcSegment,
  createLineEdge,
  createLineSegment,
  createLoopFromSegments,
  createVertexCache,
  createWallFaces,
  rotatePoint,
  type BoundarySegment,
} from "./segment-geometry"

export interface CutoutGeometry {
  bottomLoop: Ref<EdgeLoop>
  topLoop: Ref<EdgeLoop>
  wallFaces: Ref<AdvancedFace>[]
}

export type RuntimeCutout = {
  type: string
  shape?: string
  center?: { x?: number | string; y?: number | string }
  radius?: number | string
  width?: number | string
  height?: number | string
  corner_radius?: number | string
  rotation?: number | string
  points?: { x?: number | string; y?: number | string }[]
}

const CIRCLE_CUTOUT_SEGMENTS = 24

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function createSegmentedCutoutGeometry(
  repo: Repository,
  createSegments: (
    z: number,
    getVertex: (x: number, y: number) => Ref<VertexPoint>,
  ) => BoundarySegment[],
  zMin: number,
  zMax: number,
  zDir: Ref<Direction>,
): CutoutGeometry {
  // Drop any straight run that collapsed to a single point. Shape builders are
  // responsible for merging the adjacent arcs themselves; this is a backstop so
  // a coincident pair of curves can never be emitted as a zero-length edge.
  const isNonDegenerate = (segment: BoundarySegment) =>
    segment.kind === "arc" || segment.start !== segment.end
  const bottomSegments = createSegments(
    zMin,
    createVertexCache(repo, zMin),
  ).filter(isNonDegenerate)
  const topSegments = createSegments(
    zMax,
    createVertexCache(repo, zMax),
  ).filter(isNonDegenerate)
  const bottomLoop = createLoopFromSegments(repo, bottomSegments, true)
  const topLoop = createLoopFromSegments(repo, topSegments, true)
  const wallFaces = createWallFaces(
    repo,
    bottomSegments,
    topSegments,
    zMin,
    zDir,
  )

  return { bottomLoop, topLoop, wallFaces }
}

function createCircleCutoutGeometry(
  repo: Repository,
  centerX: number,
  centerY: number,
  radius: number,
  zMin: number,
  zMax: number,
  zDir: Ref<Direction>,
): CutoutGeometry {
  // Built from arc segments rather than one closed CIRCLE edge. occt meshes a
  // full cylindrical face by fanning interior triangles from the seam across the
  // opening, which spans the hole and under-measures the removal by about half;
  // segmented arcs are the same construction the rect and polygon paths already
  // use and mesh faithfully.
  const segmentCount = CIRCLE_CUTOUT_SEGMENTS
  const fullTurn = Math.PI * 2

  return createSegmentedCutoutGeometry(
    repo,
    (z, getVertex) => {
      const arcs: BoundarySegment[] = []
      for (let index = 0; index < segmentCount; index++) {
        arcs.push(
          createArcSegment(
            repo,
            centerX,
            centerY,
            radius,
            (index * fullTurn) / segmentCount,
            ((index + 1) * fullTurn) / segmentCount,
            0,
            centerX,
            centerY,
            z,
            getVertex,
          ),
        )
      }
      return arcs
    },
    zMin,
    zMax,
    zDir,
  )
}

function createRectCutoutGeometry(
  repo: Repository,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  cornerRadius: number,
  rotation: number,
  zMin: number,
  zMax: number,
  zDir: Ref<Direction>,
): CutoutGeometry {
  const halfWidth = width / 2
  const halfHeight = height / 2
  const radius = Math.min(cornerRadius, halfWidth, halfHeight)
  const straightHalfWidth = halfWidth - radius
  const straightHalfHeight = halfHeight - radius
  const quarter = Math.PI / 2

  return createSegmentedCutoutGeometry(
    repo,
    (z, getVertex) => {
      if (radius <= 0) {
        const corners = [
          { x: centerX - halfWidth, y: centerY - halfHeight },
          { x: centerX + halfWidth, y: centerY - halfHeight },
          { x: centerX + halfWidth, y: centerY + halfHeight },
          { x: centerX - halfWidth, y: centerY + halfHeight },
        ].map((corner) =>
          rotatePoint(corner.x, corner.y, centerX, centerY, rotation),
        )
        return corners.map((corner, index) =>
          createLineSegment(
            repo,
            corner,
            corners[(index + 1) % corners.length]!,
            getVertex,
          ),
        )
      }

      // A corner radius that reaches half the side length collapses that side's
      // straight run to nothing. A panel tab arrives with corner_radius equal to
      // half the routed slot width, so this is the common case, not an edge
      // case: each end becomes a single half-circle rather than two quarter
      // circles separated by a zero-length side, which would leave two
      // coincident circles meeting at a vertex.
      const hasHorizontalRun = straightHalfWidth > 0
      const hasVerticalRun = straightHalfHeight > 0
      const at = (x: number, y: number) =>
        rotatePoint(x, y, centerX, centerY, rotation)

      const segments: BoundarySegment[] = []

      if (hasHorizontalRun) {
        segments.push(
          createLineSegment(
            repo,
            at(centerX - straightHalfWidth, centerY - halfHeight),
            at(centerX + straightHalfWidth, centerY - halfHeight),
            getVertex,
          ),
        )
      }

      if (hasVerticalRun) {
        segments.push(
          createArcSegment(
            repo,
            centerX + straightHalfWidth,
            centerY - straightHalfHeight,
            radius,
            quarter * 3,
            quarter * 4,
            rotation,
            centerX,
            centerY,
            z,
            getVertex,
          ),
          createLineSegment(
            repo,
            at(centerX + halfWidth, centerY - straightHalfHeight),
            at(centerX + halfWidth, centerY + straightHalfHeight),
            getVertex,
          ),
          createArcSegment(
            repo,
            centerX + straightHalfWidth,
            centerY + straightHalfHeight,
            radius,
            0,
            quarter,
            rotation,
            centerX,
            centerY,
            z,
            getVertex,
          ),
        )
      } else {
        segments.push(
          createArcSegment(
            repo,
            centerX + straightHalfWidth,
            centerY,
            radius,
            quarter * 3,
            quarter * 5,
            rotation,
            centerX,
            centerY,
            z,
            getVertex,
          ),
        )
      }

      if (hasHorizontalRun) {
        segments.push(
          createLineSegment(
            repo,
            at(centerX + straightHalfWidth, centerY + halfHeight),
            at(centerX - straightHalfWidth, centerY + halfHeight),
            getVertex,
          ),
        )
      }

      if (hasVerticalRun) {
        segments.push(
          createArcSegment(
            repo,
            centerX - straightHalfWidth,
            centerY + straightHalfHeight,
            radius,
            quarter,
            quarter * 2,
            rotation,
            centerX,
            centerY,
            z,
            getVertex,
          ),
          createLineSegment(
            repo,
            at(centerX - halfWidth, centerY + straightHalfHeight),
            at(centerX - halfWidth, centerY - straightHalfHeight),
            getVertex,
          ),
          createArcSegment(
            repo,
            centerX - straightHalfWidth,
            centerY - straightHalfHeight,
            radius,
            quarter * 2,
            quarter * 3,
            rotation,
            centerX,
            centerY,
            z,
            getVertex,
          ),
        )
      } else {
        segments.push(
          createArcSegment(
            repo,
            centerX - straightHalfWidth,
            centerY,
            radius,
            quarter,
            quarter * 3,
            rotation,
            centerX,
            centerY,
            z,
            getVertex,
          ),
        )
      }

      return segments
    },
    zMin,
    zMax,
    zDir,
  )
}

function signedArea(points: { x: number; y: number }[]): number {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i]!.x * points[j]!.y - points[j]!.x * points[i]!.y
  }
  return area / 2
}

function dropRepeatedPoints(points: { x: number; y: number }[]): {
  x: number
  y: number
}[] {
  const isSame = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    return Math.sqrt(dx * dx + dy * dy) <= 1e-6
  }

  const unique: { x: number; y: number }[] = []
  for (const point of points) {
    const previous = unique[unique.length - 1]
    if (previous && isSame(previous, point)) {
      continue
    }
    unique.push({ x: point.x, y: point.y })
  }
  while (unique.length > 1 && isSame(unique[0]!, unique[unique.length - 1]!)) {
    unique.pop()
  }
  return unique
}

function createPolygonCutoutGeometry(
  repo: Repository,
  points: { x: number; y: number }[],
  zMin: number,
  zMax: number,
  zDir: Ref<Direction>,
): CutoutGeometry {
  const vertices = dropRepeatedPoints(points)
  if (signedArea(vertices) < 0) {
    vertices.reverse()
  }

  return createSegmentedCutoutGeometry(
    repo,
    (z, getVertex) =>
      vertices.map((point, index) =>
        createLineSegment(
          repo,
          point,
          vertices[(index + 1) % vertices.length]!,
          getVertex,
        ),
      ),
    zMin,
    zMax,
    zDir,
  )
}

export function createCutoutGeometry({
  repo,
  cutout,
  boardThickness,
  zDir,
}: {
  repo: Repository
  cutout: RuntimeCutout
  /** The cutout spans the full board thickness, so the caller supplies the
   * thickness and the geometry derives its own z extents. */
  boardThickness: number
  zDir: Ref<Direction>
}): CutoutGeometry | null {
  const zMin = -boardThickness / 2
  const zMax = boardThickness / 2

  const centerX = cutout.center?.x
  const centerY = cutout.center?.y

  if (cutout.shape === "circle") {
    if (!isFiniteNumber(centerX) || !isFiniteNumber(centerY)) return null
    const radius = isFiniteNumber(cutout.radius) ? cutout.radius : null
    if (radius === null || radius <= 0) return null
    return createCircleCutoutGeometry(
      repo,
      centerX,
      centerY,
      radius,
      zMin,
      zMax,
      zDir,
    )
  }

  if (cutout.shape === "rect") {
    if (!isFiniteNumber(centerX) || !isFiniteNumber(centerY)) return null
    const width = isFiniteNumber(cutout.width) ? cutout.width : null
    const height = isFiniteNumber(cutout.height) ? cutout.height : null
    if (width === null || height === null || width <= 0 || height <= 0) {
      return null
    }
    const cornerRadius = isFiniteNumber(cutout.corner_radius)
      ? cutout.corner_radius
      : 0
    const rotation = isFiniteNumber(cutout.rotation)
      ? toRadians(cutout.rotation)
      : 0
    return createRectCutoutGeometry(
      repo,
      centerX,
      centerY,
      width,
      height,
      cornerRadius,
      rotation,
      zMin,
      zMax,
      zDir,
    )
  }

  if (cutout.shape === "polygon") {
    if (!Array.isArray(cutout.points)) return null
    const points = cutout.points.filter(
      (point) => isFiniteNumber(point?.x) && isFiniteNumber(point?.y),
    ) as { x: number; y: number }[]
    if (points.length < 3) return null
    return createPolygonCutoutGeometry(repo, points, zMin, zMax, zDir)
  }

  return null
}
