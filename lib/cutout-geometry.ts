import type { Ref, Repository } from "stepts"
import {
  AdvancedFace,
  Axis2Placement3D,
  CartesianPoint,
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
 * Corner points for a `pcb_cutout`, wound counter-clockwise to match the board
 * outline. Returns null for shapes that aren't straight-edged polygons
 * (circle is handled as a cylindrical hole, path isn't supported yet).
 */
export function getCutoutPolygonPoints(cutout: any): Point[] | null {
  let points: Point[]

  if (cutout.shape === "polygon") {
    points = (cutout.points ?? []) as Point[]
  } else if (cutout.shape === "rect") {
    // ponytail: corner_radius is ignored, cutouts come out with sharp corners.
    // Add rounding when a real board needs it (needs arc segments like pill holes).
    const halfWidth = cutout.width / 2
    const halfHeight = cutout.height / 2
    const rotation = ((cutout.rotation ?? 0) * Math.PI) / 180
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    points = (
      [
        [-halfWidth, -halfHeight],
        [halfWidth, -halfHeight],
        [halfWidth, halfHeight],
        [-halfWidth, halfHeight],
      ] as const
    ).map(([dx, dy]) => ({
      x: cutout.center.x + dx * cos - dy * sin,
      y: cutout.center.y + dx * sin + dy * cos,
    }))
  } else {
    return null
  }

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
 * Builds the boundary loops and planar walls for a straight-edged hole through
 * the board, matching the shape of the circular/pill hole geometries.
 */
export function createPolygonHoleGeometry(
  repo: Repository,
  points: Point[],
  zMin: number,
  zMax: number,
): CutoutHoleGeometry {
  const createVertices = (z: number) =>
    points.map((point) =>
      repo.add(
        new VertexPoint(
          "",
          repo.add(new CartesianPoint("", point.x, point.y, z)),
        ),
      ),
    )

  const bottomVertices = createVertices(zMin)
  const topVertices = createVertices(zMax)

  const bottomEdges: Ref<EdgeCurve>[] = []
  const topEdges: Ref<EdgeCurve>[] = []
  const verticalEdges: Ref<EdgeCurve>[] = []
  for (let index = 0; index < points.length; index++) {
    const next = (index + 1) % points.length
    bottomEdges.push(
      createEdge(repo, bottomVertices[index]!, bottomVertices[next]!),
    )
    topEdges.push(createEdge(repo, topVertices[index]!, topVertices[next]!))
    verticalEdges.push(
      createEdge(repo, bottomVertices[index]!, topVertices[index]!),
    )
  }

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
  for (let index = 0; index < points.length; index++) {
    const next = (index + 1) % points.length
    const start = points[index]!
    const end = points[next]!
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.hypot(dx, dy)

    // Points are CCW, so the wall normal must point inwards (into the hole).
    const normalDir = repo.add(new Direction("", -dy / length, dx / length, 0))
    const refDir = repo.add(new Direction("", dx / length, dy / length, 0))
    const placement = repo.add(
      new Axis2Placement3D(
        "",
        bottomVertices[index]!.resolve(repo).pnt,
        normalDir,
        refDir,
      ),
    )
    const loop = repo.add(
      new EdgeLoop("", [
        repo.add(new OrientedEdge("", bottomEdges[index]!, true)),
        repo.add(new OrientedEdge("", verticalEdges[next]!, true)),
        repo.add(new OrientedEdge("", topEdges[index]!, false)),
        repo.add(new OrientedEdge("", verticalEdges[index]!, false)),
      ]),
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
