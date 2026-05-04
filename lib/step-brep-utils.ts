import type { Ref, Repository } from "stepts"
import {
  AdvancedFace,
  Axis2Placement3D,
  CartesianPoint,
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
import type { Point3 } from "./scene-geometry"

export function createVertex(
  repo: Repository,
  point: Point3,
): Ref<VertexPoint> {
  return repo.add(
    new VertexPoint(
      "",
      repo.add(new CartesianPoint("", point.x, point.y, point.z)),
    ),
  )
}

function createEdge(
  repo: Repository,
  vStart: Ref<VertexPoint>,
  vEnd: Ref<VertexPoint>,
): Ref<EdgeCurve> {
  const pStart = vStart.resolve(repo).pnt.resolve(repo)
  const pEnd = vEnd.resolve(repo).pnt.resolve(repo)
  const dx = pEnd.x - pStart.x
  const dy = pEnd.y - pStart.y
  const dz = pEnd.z - pStart.z
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz)

  if (length < 1e-10) {
    const dir = repo.add(new Direction("", 1, 0, 0))
    const vec = repo.add(new Vector("", dir, 1e-10))
    const line = repo.add(new Line("", vStart.resolve(repo).pnt, vec))
    return repo.add(new EdgeCurve("", vStart, vEnd, line, true))
  }

  const dir = repo.add(new Direction("", dx / length, dy / length, dz / length))
  const vec = repo.add(new Vector("", dir, length))
  const line = repo.add(new Line("", vStart.resolve(repo).pnt, vec))
  return repo.add(new EdgeCurve("", vStart, vEnd, line, true))
}

export function createFaceFromVertices(
  repo: Repository,
  vertices: Ref<VertexPoint>[],
): Ref<AdvancedFace> {
  const edges = vertices.map((vertex, index) =>
    createEdge(repo, vertex, vertices[(index + 1) % vertices.length]!),
  )

  const edgeLoop = repo.add(
    new EdgeLoop(
      "",
      edges.map((edge) => repo.add(new OrientedEdge("", edge, true))),
    ),
  )

  const p1 = vertices[0]!.resolve(repo).pnt.resolve(repo)
  const p2 = vertices[1]!.resolve(repo).pnt.resolve(repo)
  const p3 = vertices[2]!.resolve(repo).pnt.resolve(repo)

  const ux = p2.x - p1.x
  const uy = p2.y - p1.y
  const uz = p2.z - p1.z
  const vx = p3.x - p1.x
  const vy = p3.y - p1.y
  const vz = p3.z - p1.z

  const nx = uy * vz - uz * vy
  const ny = uz * vx - ux * vz
  const nz = ux * vy - uy * vx
  const normalLength = Math.sqrt(nx * nx + ny * ny + nz * nz)
  const normal =
    normalLength < 1e-10
      ? repo.add(new Direction("", 0, 0, 1))
      : repo.add(
          new Direction(
            "",
            nx / normalLength,
            ny / normalLength,
            nz / normalLength,
          ),
        )

  const refLength = Math.sqrt(ux * ux + uy * uy + uz * uz)
  const refDir =
    refLength < 1e-10
      ? repo.add(new Direction("", 1, 0, 0))
      : repo.add(
          new Direction("", ux / refLength, uy / refLength, uz / refLength),
        )

  const placement = repo.add(
    new Axis2Placement3D("", vertices[0]!.resolve(repo).pnt, normal, refDir),
  )
  const plane = repo.add(new Plane("", placement))

  return repo.add(
    new AdvancedFace(
      "",
      [repo.add(new FaceOuterBound("", edgeLoop, true))],
      plane,
      true,
    ),
  )
}
