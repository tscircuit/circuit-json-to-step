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

type PillBoundarySegment =
  | {
      kind: "arc"
      edge: Ref<EdgeCurve>
      start: Ref<VertexPoint>
      end: Ref<VertexPoint>
      centerX: number
      centerY: number
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

export function getPillGeometry(hole: any): PillGeometry {
  const centerX = typeof hole.x === "number" ? hole.x : (hole.x as any).value
  const centerY = typeof hole.y === "number" ? hole.y : (hole.y as any).value
  const width = hole.hole_width
  const height = hole.hole_height
  const ccwRotation = hole.ccw_rotation ?? 0
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

export function rotatePoint(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  angle: number,
): { x: number; y: number } {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
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

function createVertexCache(repo: Repository, z: number) {
  const vertices = new Map<string, Ref<VertexPoint>>()
  const normalize = (value: number) => {
    const rounded = Number(value.toFixed(9))
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

  if (length < 1e-10) {
    const dir = repo.add(new Direction("", 1, 0, 0))
    const vec = repo.add(new Vector("", dir, 1e-10))
    const line = repo.add(new Line("", v1.resolve(repo).pnt, vec))
    return repo.add(new EdgeCurve("", v1, v2, line, true))
  }

  const dir = repo.add(new Direction("", dx / length, dy / length, dz / length))
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

function createArcSegment(
  repo: Repository,
  centerX: number,
  centerY: number,
  z: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  rotation: number,
  centerX0: number,
  centerY0: number,
  getVertex: (x: number, y: number) => Ref<VertexPoint>,
): PillBoundarySegment {
  const start = rotatePoint(
    centerX + radius * Math.cos(startAngle),
    centerY + radius * Math.sin(startAngle),
    centerX0,
    centerY0,
    rotation,
  )
  const end = rotatePoint(
    centerX + radius * Math.cos(endAngle),
    centerY + radius * Math.sin(endAngle),
    centerX0,
    centerY0,
    rotation,
  )
  const center = rotatePoint(centerX, centerY, centerX0, centerY0, rotation)
  const startVertex = getVertex(start.x, start.y)
  const endVertex = getVertex(end.x, end.y)
  const centerPoint = repo.add(new CartesianPoint("", center.x, center.y, z))
  const normalDir = repo.add(new Direction("", 0, 0, -1))
  const refDir = repo.add(
    new Direction("", Math.cos(rotation), Math.sin(rotation), 0),
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
    centerX,
    centerY,
    radius,
  }
}

function createPillBoundarySegments(
  repo: Repository,
  hole: any,
  z: number,
): PillBoundarySegment[] {
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
        z,
        radius,
        -Math.PI / 2,
        Math.PI / 2,
        rotation,
        centerX,
        centerY,
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
        z,
        radius,
        Math.PI / 2,
        (3 * Math.PI) / 2,
        rotation,
        centerX,
        centerY,
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
      z,
      radius,
      Math.PI,
      0,
      rotation,
      centerX,
      centerY,
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
      z,
      radius,
      0,
      Math.PI,
      rotation,
      centerX,
      centerY,
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

function createLoopFromSegments(
  repo: Repository,
  segments: PillBoundarySegment[],
  orientation: boolean,
): Ref<EdgeLoop> {
  return repo.add(
    new EdgeLoop(
      "",
      segments.map((segment) =>
        repo.add(new OrientedEdge("", segment.edge, orientation)),
      ),
    ),
  )
}

export function createPillHoleGeometry(
  repo: Repository,
  hole: any,
  zMin: number,
  zMax: number,
  zDir: Ref<Direction>,
): PillHoleGeometry {
  const geom = getPillGeometry(hole)
  const bottomSegments = createPillBoundarySegments(repo, hole, zMin)
  const topSegments = createPillBoundarySegments(repo, hole, zMax)
  const bottomLoop = createLoopFromSegments(repo, bottomSegments, true)
  const topLoop = createLoopFromSegments(repo, topSegments, true)
  const wallFaces: Ref<AdvancedFace>[] = []
  const verticalEdges = new Map<string, Ref<EdgeCurve>>()
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
      const center = rotatePoint(
        bottomSegment.centerX,
        bottomSegment.centerY,
        geom.centerX,
        geom.centerY,
        geom.rotation,
      )
      const bottomCenter = repo.add(
        new CartesianPoint("", center.x, center.y, zMin),
      )
      const refDir = repo.add(
        new Direction("", Math.cos(geom.rotation), Math.sin(geom.rotation), 0),
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

  return { bottomLoop, topLoop, wallFaces }
}
