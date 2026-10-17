import type { Ref, Repository } from "stepts"
import { AdvancedFace, Direction, EdgeLoop } from "stepts"
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

export interface PillGeometry {
  centerX: number
  centerY: number
  width: number
  height: number
  rotation: number
  radius: number
  straightHalfLength: number
  isHorizontal: boolean
}

export interface PillHoleGeometry {
  bottomLoop: Ref<EdgeLoop>
  topLoop: Ref<EdgeLoop>
  wallFaces: Ref<AdvancedFace>[]
}

export function getPillGeometry(hole: any): PillGeometry {
  const offsetX = hole.hole_offset_x ?? 0
  const offsetY = hole.hole_offset_y ?? 0
  const centerX =
    (typeof hole.x === "number" ? hole.x : (hole.x as any).value) + offsetX
  const centerY =
    (typeof hole.y === "number" ? hole.y : (hole.y as any).value) + offsetY
  const width = hole.hole_width
  const height = hole.hole_height
  // rotated_pill_hole_with_rect_pad names this hole_ccw_rotation; the oval and
  // polygon pad variants name it ccw_rotation.
  const ccwRotation = hole.hole_ccw_rotation ?? hole.ccw_rotation ?? 0
  const rotation = (ccwRotation * Math.PI) / 180
  const isHorizontal = width >= height
  const radius = Math.min(width, height) / 2
  const straightHalfLength = Math.abs(width - height) / 2

  return {
    centerX,
    centerY,
    width,
    height,
    rotation,
    radius,
    straightHalfLength,
    isHorizontal,
  }
}

function createPillBoundarySegments(
  repo: Repository,
  hole: any,
  z: number,
): BoundarySegment[] {
  const geom = getPillGeometry(hole)
  const {
    centerX,
    centerY,
    radius,
    straightHalfLength,
    rotation,
    isHorizontal,
  } = geom
  const capOffset = straightHalfLength
  const getVertex = createVertexCache(repo, z)

  if (isHorizontal) {
    return [
      createArcSegment(
        repo,
        centerX + capOffset,
        centerY,
        radius,
        -Math.PI / 2,
        Math.PI / 2,
        rotation,
        centerX,
        centerY,
        z,
        getVertex,
      ),
      createLineSegment(
        repo,
        rotatePoint(
          centerX + capOffset,
          centerY - radius,
          centerX,
          centerY,
          rotation,
        ),
        rotatePoint(
          centerX - capOffset,
          centerY - radius,
          centerX,
          centerY,
          rotation,
        ),
        getVertex,
      ),
      createArcSegment(
        repo,
        centerX - capOffset,
        centerY,
        radius,
        Math.PI / 2,
        (3 * Math.PI) / 2,
        rotation,
        centerX,
        centerY,
        z,
        getVertex,
      ),
      createLineSegment(
        repo,
        rotatePoint(
          centerX - capOffset,
          centerY + radius,
          centerX,
          centerY,
          rotation,
        ),
        rotatePoint(
          centerX + capOffset,
          centerY + radius,
          centerX,
          centerY,
          rotation,
        ),
        getVertex,
      ),
    ]
  }

  return [
    createArcSegment(
      repo,
      centerX,
      centerY - capOffset,
      radius,
      Math.PI,
      0,
      rotation,
      centerX,
      centerY,
      z,
      getVertex,
    ),
    createLineSegment(
      repo,
      rotatePoint(
        centerX + radius,
        centerY - capOffset,
        centerX,
        centerY,
        rotation,
      ),
      rotatePoint(
        centerX + radius,
        centerY + capOffset,
        centerX,
        centerY,
        rotation,
      ),
      getVertex,
    ),
    createArcSegment(
      repo,
      centerX,
      centerY + capOffset,
      radius,
      0,
      Math.PI,
      rotation,
      centerX,
      centerY,
      z,
      getVertex,
    ),
    createLineSegment(
      repo,
      rotatePoint(
        centerX - radius,
        centerY + capOffset,
        centerX,
        centerY,
        rotation,
      ),
      rotatePoint(
        centerX - radius,
        centerY - capOffset,
        centerX,
        centerY,
        rotation,
      ),
      getVertex,
    ),
  ]
}

export function createPillHoleGeometry(
  repo: Repository,
  hole: any,
  zMin: number,
  zMax: number,
  zDir: Ref<Direction>,
): PillHoleGeometry {
  const bottomSegments = createPillBoundarySegments(repo, hole, zMin)
  const topSegments = createPillBoundarySegments(repo, hole, zMax)
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
