import type { PcbHoleRect } from "circuit-json"
import type { Direction, Ref, Repository } from "stepts"
import {
  coordinateOf,
  createLineSegment,
  createLoopFromSegments,
  createVertexCache,
  createWallFaces,
} from "./pill-geometry"

/** Cut an axis-aligned rectangle through zMin..zMax in board-space mm. */
export function createRectangularHoleGeometry({
  repo,
  hole,
  zMin,
  zMax,
  zDir,
}: {
  repo: Repository
  hole: PcbHoleRect
  zMin: number
  zMax: number
  zDir: Ref<Direction>
}) {
  const x = coordinateOf(hole.x)
  const y = coordinateOf(hole.y)
  const halfWidth = hole.hole_width / 2
  const halfHeight = hole.hole_height / 2
  // Clockwise around the opening, so wall normals point into the hole.
  const corners = [
    { x: x - halfWidth, y: y - halfHeight },
    { x: x - halfWidth, y: y + halfHeight },
    { x: x + halfWidth, y: y + halfHeight },
    { x: x + halfWidth, y: y - halfHeight },
  ]
  const boundary = (z: number) => {
    const getVertex = createVertexCache(repo, z)
    return corners.map((start, index) =>
      createLineSegment({
        repo,
        start,
        end: corners[(index + 1) % corners.length],
        getVertex,
      }),
    )
  }
  const bottomSegments = boundary(zMin)
  const topSegments = boundary(zMax)
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
