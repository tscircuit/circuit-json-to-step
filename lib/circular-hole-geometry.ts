import type { Ref, Repository } from "stepts"
import { AdvancedFace, Direction, EdgeLoop } from "stepts"
import {
  createArcSegment,
  createLoopFromSegments,
  createVertexCache,
  coordinateOf,
  createWallFaces,
  type PillHole,
  fullCircleSegments,
  type PillBoundarySegment,
} from "./pill-geometry"

function createCircleBoundary({
  repo,
  holeX,
  holeY,
  z,
  radius,
}: {
  repo: Repository
  holeX: number
  holeY: number
  z: number
  radius: number
}): PillBoundarySegment[] {
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

interface CircularHoleGeometry {
  bottomLoop: Ref<EdgeLoop>
  topLoop: Ref<EdgeLoop>
  wallFaces: Ref<AdvancedFace>[]
}

/** The circular fields of a pcb_hole or pcb_plated_hole, on top of the shared
 * PillHole shape. */
interface CircularHole extends PillHole {
  hole_diameter?: number
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

  const bottomSegments = createCircleBoundary({
    repo,
    holeX,
    holeY,
    z: zMin,
    radius,
  })
  const topSegments = createCircleBoundary({
    repo,
    holeX,
    holeY,
    z: zMax,
    radius,
  })

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
