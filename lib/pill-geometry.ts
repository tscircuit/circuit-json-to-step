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

  return { bottomLoop, topLoop, wallFaces }
}
