import type { PcbHoleRect } from "circuit-json"
import type { EdgeCurve, Ref, Repository } from "stepts"
import { coordinateOf } from "./pill-geometry"
import {
  createFaceFromVertices,
  createLoopFromVertices,
  createVertex,
} from "./step-brep-utils"

/** Cut an axis-aligned rectangle through zMin..zMax in board-space mm. */
export function createRectangularHoleGeometry({
  repo,
  hole,
  zMin,
  zMax,
}: {
  repo: Repository
  hole: PcbHoleRect
  zMin: number
  zMax: number
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
  const bottom = corners.map((point) =>
    createVertex(repo, { ...point, z: zMin }),
  )
  const top = corners.map((point) => createVertex(repo, { ...point, z: zMax }))
  const edges = new Map<string, Ref<EdgeCurve>>()
  return {
    bottomLoop: createLoopFromVertices(repo, [...bottom].reverse(), edges),
    topLoop: createLoopFromVertices(repo, top, edges),
    wallFaces: bottom.map((vertex, index) => {
      const next = (index + 1) % bottom.length
      return createFaceFromVertices(
        repo,
        [vertex, bottom[next], top[next], top[index]],
        edges,
      )
    }),
  }
}
