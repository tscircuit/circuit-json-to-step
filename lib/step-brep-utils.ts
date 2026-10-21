import type { Ref, Repository } from "stepts"
import {
  AdvancedFace,
  Axis2Placement3D,
  CartesianPoint,
  Direction,
  EdgeCurve,
  EdgeLoop,
  FaceOuterBound,
  FaceBound,
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

export function createLoopFromVertices(
  repo: Repository,
  vertices: Ref<VertexPoint>[],
  sharedEdges?: Map<string, Ref<EdgeCurve>>,
): Ref<EdgeLoop> {
  const edges = vertices.map((vertex, index) => {
    const next = vertices[(index + 1) % vertices.length]!
    const key = [Number(vertex.id), Number(next.id)]
      .sort((a, b) => a - b)
      .join(":")
    const edge = sharedEdges?.get(key) ?? createEdge(repo, vertex, next)
    sharedEdges?.set(key, edge)
    return repo.add(
      new OrientedEdge("", edge, edge.resolve(repo).start.id === vertex.id),
    )
  })
  return repo.add(new EdgeLoop("", edges))
}

export function createFaceFromVertices(
  repo: Repository,
  vertices: Ref<VertexPoint>[],
  sharedEdges?: Map<string, Ref<EdgeCurve>>,
  holes: Ref<VertexPoint>[][] = [],
): Ref<AdvancedFace> {
  const edgeLoop = createLoopFromVertices(repo, vertices, sharedEdges)

  const p1 = vertices[0]!.resolve(repo).pnt.resolve(repo)
  const p2 = vertices[1]!.resolve(repo).pnt.resolve(repo)

  const ux = p2.x - p1.x
  const uy = p2.y - p1.y
  const uz = p2.z - p1.z
  let nx = 0,
    ny = 0,
    nz = 0
  // Clipped boundary loops may start with several collinear vertices.
  for (const vertex of vertices.slice(2)) {
    const point = vertex.resolve(repo).pnt.resolve(repo)
    const vx = point.x - p1.x,
      vy = point.y - p1.y,
      vz = point.z - p1.z
    nx = uy * vz - uz * vy
    ny = uz * vx - ux * vz
    nz = ux * vy - uy * vx
    if (nx * nx + ny * ny + nz * nz > 1e-20) break
  }
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
      [
        repo.add(new FaceOuterBound("", edgeLoop, true)),
        ...holes.map((hole) =>
          repo.add(
            new FaceBound(
              "",
              createLoopFromVertices(repo, hole, sharedEdges),
              true,
            ),
          ),
        ),
      ],
      plane,
      true,
    ),
  )
}
