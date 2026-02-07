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

/**
 * Pill geometry parameters
 */
export interface PillGeometry {
  centerX: number
  centerY: number
  width: number
  height: number
  rotation: number // radians, counter-clockwise
  radius: number // end cap radius (half of min(width, height))
  straightHalfLength: number // half of |width - height|
  isHorizontal: boolean // true if width >= height (semicircles on left/right)
}

/**
 * Calculate pill geometry parameters from hole data
 */
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

/**
 * Rotate a point around a center by a given angle
 */
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

/**
 * Helper to create an edge between two vertices
 */
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

/**
 * Create a semicircular arc edge
 */
function createArcEdge(
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
): Ref<EdgeCurve> {
  // Calculate start and end points
  const startX = centerX + radius * Math.cos(startAngle)
  const startY = centerY + radius * Math.sin(startAngle)
  const endX = centerX + radius * Math.cos(endAngle)
  const endY = centerY + radius * Math.sin(endAngle)

  // Rotate points
  const startRotated = rotatePoint(startX, startY, centerX0, centerY0, rotation)
  const endRotated = rotatePoint(endX, endY, centerX0, centerY0, rotation)

  // Create vertices
  const startVertex = repo.add(
    new VertexPoint(
      "",
      repo.add(new CartesianPoint("", startRotated.x, startRotated.y, z)),
    ),
  )
  const endVertex = repo.add(
    new VertexPoint(
      "",
      repo.add(new CartesianPoint("", endRotated.x, endRotated.y, z)),
    ),
  )

  // Create circle placement (center needs to be rotated too)
  const centerRotated = rotatePoint(
    centerX,
    centerY,
    centerX0,
    centerY0,
    rotation,
  )
  const centerPoint = repo.add(
    new CartesianPoint("", centerRotated.x, centerRotated.y, z),
  )

  // Determine circle orientation based on rotation
  // For holes in the board (facing down at z=0, up at z=thickness)
  // The normal should point in -Z direction for the edge to be oriented correctly
  const normalDir = repo.add(new Direction("", 0, 0, -1))

  // Reference direction - this determines the starting point of the circle
  // We need to account for the rotation in the reference direction
  const refAngle = rotation
  const refDir = repo.add(
    new Direction("", Math.cos(refAngle), Math.sin(refAngle), 0),
  )

  const placement = repo.add(
    new Axis2Placement3D("", centerPoint, normalDir, refDir),
  )
  const circle = repo.add(new Circle("", placement, radius))

  return repo.add(new EdgeCurve("", startVertex, endVertex, circle, false))
}

/**
 * Create STEP EdgeLoop for pill hole boundary at given Z
 * Returns EdgeLoop with 4 edges: 2 semicircular arcs + 2 straight lines
 */
export function createPillHoleLoop(
  repo: Repository,
  hole: any,
  z: number,
  xDir: Ref<Direction>,
): Ref<EdgeLoop> {
  const geom = getPillGeometry(hole)
  const {
    centerX,
    centerY,
    radius,
    straightHalfLength,
    rotation,
    isHorizontal,
  } = geom

  const edges: Ref<EdgeCurve>[] = []

  if (isHorizontal) {
    // Horizontal pill: semicircles on left and right
    const capOffset = straightHalfLength

    // Right semicircle (top to bottom, clockwise when viewed from above)
    const rightArc = createArcEdge(
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
    )
    edges.push(rightArc)

    // Bottom straight edge (right to left)
    const bottomStart = rotatePoint(
      centerX + capOffset,
      centerY - radius,
      centerX,
      centerY,
      rotation,
    )
    const bottomEnd = rotatePoint(
      centerX - capOffset,
      centerY - radius,
      centerX,
      centerY,
      rotation,
    )
    const bottomV1 = repo.add(
      new VertexPoint(
        "",
        repo.add(new CartesianPoint("", bottomStart.x, bottomStart.y, z)),
      ),
    )
    const bottomV2 = repo.add(
      new VertexPoint(
        "",
        repo.add(new CartesianPoint("", bottomEnd.x, bottomEnd.y, z)),
      ),
    )
    edges.push(createLineEdge(repo, bottomV1, bottomV2))

    // Left semicircle (bottom to top)
    const leftArc = createArcEdge(
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
    )
    edges.push(leftArc)

    // Top straight edge (left to right)
    const topStart = rotatePoint(
      centerX - capOffset,
      centerY + radius,
      centerX,
      centerY,
      rotation,
    )
    const topEnd = rotatePoint(
      centerX + capOffset,
      centerY + radius,
      centerX,
      centerY,
      rotation,
    )
    const topV1 = repo.add(
      new VertexPoint(
        "",
        repo.add(new CartesianPoint("", topStart.x, topStart.y, z)),
      ),
    )
    const topV2 = repo.add(
      new VertexPoint(
        "",
        repo.add(new CartesianPoint("", topEnd.x, topEnd.y, z)),
      ),
    )
    edges.push(createLineEdge(repo, topV1, topV2))
  } else {
    // Vertical pill: semicircles on top and bottom
    const capOffset = straightHalfLength

    // Top semicircle (left to right)
    const topArc = createArcEdge(
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
    )
    edges.push(topArc)

    // Right straight edge (top to bottom)
    const rightStart = rotatePoint(
      centerX + radius,
      centerY - capOffset,
      centerX,
      centerY,
      rotation,
    )
    const rightEnd = rotatePoint(
      centerX + radius,
      centerY + capOffset,
      centerX,
      centerY,
      rotation,
    )
    const rightV1 = repo.add(
      new VertexPoint(
        "",
        repo.add(new CartesianPoint("", rightStart.x, rightStart.y, z)),
      ),
    )
    const rightV2 = repo.add(
      new VertexPoint(
        "",
        repo.add(new CartesianPoint("", rightEnd.x, rightEnd.y, z)),
      ),
    )
    edges.push(createLineEdge(repo, rightV1, rightV2))

    // Bottom semicircle (right to left)
    const bottomArc = createArcEdge(
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
    )
    edges.push(bottomArc)

    // Left straight edge (bottom to top)
    const leftStart = rotatePoint(
      centerX - radius,
      centerY + capOffset,
      centerX,
      centerY,
      rotation,
    )
    const leftEnd = rotatePoint(
      centerX - radius,
      centerY - capOffset,
      centerX,
      centerY,
      rotation,
    )
    const leftV1 = repo.add(
      new VertexPoint(
        "",
        repo.add(new CartesianPoint("", leftStart.x, leftStart.y, z)),
      ),
    )
    const leftV2 = repo.add(
      new VertexPoint(
        "",
        repo.add(new CartesianPoint("", leftEnd.x, leftEnd.y, z)),
      ),
    )
    edges.push(createLineEdge(repo, leftV1, leftV2))
  }

  // Create oriented edges (all in forward direction for proper loop orientation)
  const orientedEdges = edges.map((edge) =>
    repo.add(new OrientedEdge("", edge, true)),
  )

  return repo.add(new EdgeLoop("", orientedEdges))
}

/**
 * Create cylindrical and planar faces for pill hole walls
 * Returns 4 AdvancedFaces: 2 cylindrical (end caps) + 2 planar (straight sides)
 */
export function createPillCylindricalFaces(
  repo: Repository,
  hole: any,
  boardThickness: number,
  xDir: Ref<Direction>,
  zDir: Ref<Direction>,
): Ref<AdvancedFace>[] {
  const geom = getPillGeometry(hole)
  const {
    centerX,
    centerY,
    radius,
    straightHalfLength,
    rotation,
    isHorizontal,
  } = geom

  const faces: Ref<AdvancedFace>[] = []

  if (isHorizontal) {
    // Horizontal pill: cylindrical walls on left and right, planar on top and bottom
    const capOffset = straightHalfLength

    // Right cylindrical face
    faces.push(
      createCylindricalWall(
        repo,
        centerX + capOffset,
        centerY,
        radius,
        -Math.PI / 2,
        Math.PI / 2,
        rotation,
        centerX,
        centerY,
        boardThickness,
        zDir,
        xDir,
      ),
    )

    // Bottom planar face
    faces.push(
      createPlanarWall(
        repo,
        centerX - capOffset,
        centerY - radius,
        centerX + capOffset,
        centerY - radius,
        rotation,
        centerX,
        centerY,
        boardThickness,
        zDir,
      ),
    )

    // Left cylindrical face
    faces.push(
      createCylindricalWall(
        repo,
        centerX - capOffset,
        centerY,
        radius,
        Math.PI / 2,
        (3 * Math.PI) / 2,
        rotation,
        centerX,
        centerY,
        boardThickness,
        zDir,
        xDir,
      ),
    )

    // Top planar face
    faces.push(
      createPlanarWall(
        repo,
        centerX + capOffset,
        centerY + radius,
        centerX - capOffset,
        centerY + radius,
        rotation,
        centerX,
        centerY,
        boardThickness,
        zDir,
      ),
    )
  } else {
    // Vertical pill: cylindrical walls on top and bottom, planar on left and right
    const capOffset = straightHalfLength

    // Top cylindrical face
    faces.push(
      createCylindricalWall(
        repo,
        centerX,
        centerY - capOffset,
        radius,
        Math.PI,
        0,
        rotation,
        centerX,
        centerY,
        boardThickness,
        zDir,
        xDir,
      ),
    )

    // Right planar face
    faces.push(
      createPlanarWall(
        repo,
        centerX + radius,
        centerY - capOffset,
        centerX + radius,
        centerY + capOffset,
        rotation,
        centerX,
        centerY,
        boardThickness,
        zDir,
      ),
    )

    // Bottom cylindrical face
    faces.push(
      createCylindricalWall(
        repo,
        centerX,
        centerY + capOffset,
        radius,
        0,
        Math.PI,
        rotation,
        centerX,
        centerY,
        boardThickness,
        zDir,
        xDir,
      ),
    )

    // Left planar face
    faces.push(
      createPlanarWall(
        repo,
        centerX - radius,
        centerY + capOffset,
        centerX - radius,
        centerY - capOffset,
        rotation,
        centerX,
        centerY,
        boardThickness,
        zDir,
      ),
    )
  }

  return faces
}

/**
 * Create a cylindrical wall face (semicircular extrusion)
 */
function createCylindricalWall(
  repo: Repository,
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  rotation: number,
  centerX0: number,
  centerY0: number,
  boardThickness: number,
  zDir: Ref<Direction>,
  xDir: Ref<Direction>,
): Ref<AdvancedFace> {
  // Calculate edge points at bottom
  const bottomStartX = centerX + radius * Math.cos(startAngle)
  const bottomStartY = centerY + radius * Math.sin(startAngle)
  const bottomEndX = centerX + radius * Math.cos(endAngle)
  const bottomEndY = centerY + radius * Math.sin(endAngle)

  // Rotate bottom points
  const bottomStart = rotatePoint(
    bottomStartX,
    bottomStartY,
    centerX0,
    centerY0,
    rotation,
  )
  const bottomEnd = rotatePoint(
    bottomEndX,
    bottomEndY,
    centerX0,
    centerY0,
    rotation,
  )

  // Create bottom edge vertices
  const bottomStartVertex = repo.add(
    new VertexPoint(
      "",
      repo.add(new CartesianPoint("", bottomStart.x, bottomStart.y, 0)),
    ),
  )
  const bottomEndVertex = repo.add(
    new VertexPoint(
      "",
      repo.add(new CartesianPoint("", bottomEnd.x, bottomEnd.y, 0)),
    ),
  )

  // Create top edge vertices
  const topStart = repo.add(
    new VertexPoint(
      "",
      repo.add(
        new CartesianPoint("", bottomStart.x, bottomStart.y, boardThickness),
      ),
    ),
  )
  const topEnd = repo.add(
    new VertexPoint(
      "",
      repo.add(
        new CartesianPoint("", bottomEnd.x, bottomEnd.y, boardThickness),
      ),
    ),
  )

  // Create arc edge at bottom
  const centerRotated = rotatePoint(
    centerX,
    centerY,
    centerX0,
    centerY0,
    rotation,
  )
  const bottomCenter = repo.add(
    new CartesianPoint("", centerRotated.x, centerRotated.y, 0),
  )
  const bottomPlacement = repo.add(
    new Axis2Placement3D(
      "",
      bottomCenter,
      repo.add(new Direction("", 0, 0, -1)),
      xDir,
    ),
  )
  const bottomCircle = repo.add(new Circle("", bottomPlacement, radius))
  const bottomArc = repo.add(
    new EdgeCurve("", bottomStartVertex, bottomEndVertex, bottomCircle, false),
  )

  // Create arc edge at top
  const topCenter = repo.add(
    new CartesianPoint("", centerRotated.x, centerRotated.y, boardThickness),
  )
  const topPlacement = repo.add(new Axis2Placement3D("", topCenter, zDir, xDir))
  const topCircle = repo.add(new Circle("", topPlacement, radius))
  const topArc = repo.add(new EdgeCurve("", topEnd, topStart, topCircle, false))

  // Create vertical edges
  const v1 = repo.add(
    new VertexPoint(
      "",
      repo.add(new CartesianPoint("", bottomStart.x, bottomStart.y, 0)),
    ),
  )
  const v2 = repo.add(
    new VertexPoint(
      "",
      repo.add(
        new CartesianPoint("", bottomStart.x, bottomStart.y, boardThickness),
      ),
    ),
  )
  const v3 = repo.add(
    new VertexPoint(
      "",
      repo.add(new CartesianPoint("", bottomEnd.x, bottomEnd.y, 0)),
    ),
  )
  const v4 = repo.add(
    new VertexPoint(
      "",
      repo.add(
        new CartesianPoint("", bottomEnd.x, bottomEnd.y, boardThickness),
      ),
    ),
  )

  // Create vertical line edges
  const dir1 = repo.add(new Direction("", 0, 0, 1))
  const vec1 = repo.add(new Vector("", dir1, boardThickness))
  const line1 = repo.add(new Line("", v1.resolve(repo).pnt, vec1))
  const edge1 = repo.add(new EdgeCurve("", v1, v2, line1, true))

  const dir2 = repo.add(new Direction("", 0, 0, 1))
  const vec2 = repo.add(new Vector("", dir2, boardThickness))
  const line2 = repo.add(new Line("", v3.resolve(repo).pnt, vec2))
  const edge2 = repo.add(new EdgeCurve("", v3, v4, line2, true))

  // Create edge loop
  const loop = repo.add(
    new EdgeLoop("", [
      repo.add(new OrientedEdge("", bottomArc, true)),
      repo.add(new OrientedEdge("", edge2, true)),
      repo.add(new OrientedEdge("", topArc, false)),
      repo.add(new OrientedEdge("", edge1, false)),
    ]),
  )

  // Create cylindrical surface
  const cylinderPlacement = repo.add(
    new Axis2Placement3D("", bottomCenter, zDir, xDir),
  )
  const cylinderSurface = repo.add(
    new CylindricalSurface("", cylinderPlacement, radius),
  )

  return repo.add(
    new AdvancedFace(
      "",
      [repo.add(new FaceOuterBound("", loop, true))],
      cylinderSurface,
      false,
    ),
  )
}

/**
 * Create a planar wall face (straight line extrusion)
 */
function createPlanarWall(
  repo: Repository,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  rotation: number,
  centerX0: number,
  centerY0: number,
  boardThickness: number,
  zDir: Ref<Direction>,
): Ref<AdvancedFace> {
  // Rotate points
  const start = rotatePoint(startX, startY, centerX0, centerY0, rotation)
  const end = rotatePoint(endX, endY, centerX0, centerY0, rotation)

  // Create vertices
  const v1 = repo.add(
    new VertexPoint("", repo.add(new CartesianPoint("", start.x, start.y, 0))),
  )
  const v2 = repo.add(
    new VertexPoint("", repo.add(new CartesianPoint("", end.x, end.y, 0))),
  )
  const v3 = repo.add(
    new VertexPoint(
      "",
      repo.add(new CartesianPoint("", end.x, end.y, boardThickness)),
    ),
  )
  const v4 = repo.add(
    new VertexPoint(
      "",
      repo.add(new CartesianPoint("", start.x, start.y, boardThickness)),
    ),
  )

  // Calculate edge direction and normal
  const dx = end.x - start.x
  const dy = end.y - start.y
  const edgeLength = Math.sqrt(dx * dx + dy * dy)

  // Create bottom edge
  const bottomDir = repo.add(
    new Direction("", dx / edgeLength, dy / edgeLength, 0),
  )
  const bottomVec = repo.add(new Vector("", bottomDir, edgeLength))
  const bottomLine = repo.add(new Line("", v1.resolve(repo).pnt, bottomVec))
  const bottomEdge = repo.add(new EdgeCurve("", v1, v2, bottomLine, true))

  // Create top edge
  const topDir = repo.add(
    new Direction("", dx / edgeLength, dy / edgeLength, 0),
  )
  const topVec = repo.add(new Vector("", topDir, edgeLength))
  const topLine = repo.add(new Line("", v4.resolve(repo).pnt, topVec))
  const topEdge = repo.add(new EdgeCurve("", v4, v3, topLine, true))

  // Create vertical edges
  const vertDir = repo.add(new Direction("", 0, 0, 1))
  const vertVec1 = repo.add(new Vector("", vertDir, boardThickness))
  const vertLine1 = repo.add(new Line("", v2.resolve(repo).pnt, vertVec1))
  const vertEdge1 = repo.add(new EdgeCurve("", v2, v3, vertLine1, true))

  const vertVec2 = repo.add(new Vector("", vertDir, boardThickness))
  const vertLine2 = repo.add(new Line("", v1.resolve(repo).pnt, vertVec2))
  const vertEdge2 = repo.add(new EdgeCurve("", v1, v4, vertLine2, true))

  // Create edge loop
  const loop = repo.add(
    new EdgeLoop("", [
      repo.add(new OrientedEdge("", bottomEdge, true)),
      repo.add(new OrientedEdge("", vertEdge1, true)),
      repo.add(new OrientedEdge("", topEdge, false)),
      repo.add(new OrientedEdge("", vertEdge2, false)),
    ]),
  )

  // Create plane
  // Normal is perpendicular to edge direction in XY plane
  const normalDir = repo.add(
    new Direction("", dy / edgeLength, -dx / edgeLength, 0),
  )
  const refDir = repo.add(
    new Direction("", dx / edgeLength, dy / edgeLength, 0),
  )
  const planeOrigin = repo.add(new CartesianPoint("", start.x, start.y, 0))
  const placement = repo.add(
    new Axis2Placement3D("", planeOrigin, normalDir, refDir),
  )
  const plane = repo.add(new Plane("", placement))

  return repo.add(
    new AdvancedFace(
      "",
      [repo.add(new FaceOuterBound("", loop, true))],
      plane,
      true,
    ),
  )
}
