import type { PcbHole, CircuitJson } from "circuit-json"
import {
  Repository,
  ApplicationContext,
  ApplicationProtocolDefinition,
  ProductContext,
  Product,
  ProductDefinitionContext,
  ProductDefinitionFormation,
  ProductDefinition,
  ProductDefinitionShape,
  Unknown,
  CartesianPoint,
  Direction,
  Axis2Placement3D,
  Plane,
  CylindricalSurface,
  VertexPoint,
  EdgeCurve,
  Line,
  Vector,
  EdgeLoop,
  OrientedEdge,
  FaceOuterBound,
  FaceBound,
  AdvancedFace,
  Circle,
  ClosedShell,
  ManifoldSolidBrep,
  ColourRgb,
  FillAreaStyleColour,
  FillAreaStyle,
  SurfaceStyleFillArea,
  SurfaceSideStyle,
  SurfaceStyleUsage,
  PresentationStyleAssignment,
  StyledItem,
  MechanicalDesignGeometricPresentationRepresentation,
  AdvancedBrepShapeRepresentation,
  ShapeDefinitionRepresentation,
  type Ref,
} from "stepts"
import {
  convertCircuitJsonTo3D,
  convertSceneToGLTF,
} from "circuit-json-to-gltf"
import type { Scene3D, Triangle as GLTFTriangle } from "circuit-json-to-gltf"

export interface CircuitJsonToStepOptions {
  /** Board width in mm (optional if pcb_board is present) */
  boardWidth?: number
  /** Board height in mm (optional if pcb_board is present) */
  boardHeight?: number
  /** Board thickness in mm (default: 1.6mm or from pcb_board) */
  boardThickness?: number
  /** Product name (default: "PCB") */
  productName?: string
  /** Include component meshes (default: false) */
  includeComponents?: boolean
}

/**
 * Generates triangles for a box mesh
 */
function createBoxTriangles(box: {
  center: { x: number; y: number; z: number }
  size: { x: number; y: number; z: number }
  rotation?: { x: number; y: number; z: number }
}): GLTFTriangle[] {
  const { center, size } = box
  const halfX = size.x / 2
  const halfY = size.y / 2
  const halfZ = size.z / 2

  // Define 8 corners of the box
  const corners = [
    { x: -halfX, y: -halfY, z: -halfZ },
    { x: halfX, y: -halfY, z: -halfZ },
    { x: halfX, y: halfY, z: -halfZ },
    { x: -halfX, y: halfY, z: -halfZ },
    { x: -halfX, y: -halfY, z: halfZ },
    { x: halfX, y: -halfY, z: halfZ },
    { x: halfX, y: halfY, z: halfZ },
    { x: -halfX, y: halfY, z: halfZ },
  ].map((p) => ({ x: p.x + center.x, y: p.y + center.y, z: p.z + center.z }))

  // Define triangles for each face (2 triangles per face)
  const triangles: GLTFTriangle[] = [
    // Bottom face (z = -halfZ)
    {
      vertices: [corners[0]!, corners[1]!, corners[2]!],
      normal: { x: 0, y: 0, z: -1 },
    },
    {
      vertices: [corners[0]!, corners[2]!, corners[3]!],
      normal: { x: 0, y: 0, z: -1 },
    },
    // Top face (z = halfZ)
    {
      vertices: [corners[4]!, corners[6]!, corners[5]!],
      normal: { x: 0, y: 0, z: 1 },
    },
    {
      vertices: [corners[4]!, corners[7]!, corners[6]!],
      normal: { x: 0, y: 0, z: 1 },
    },
    // Front face (y = -halfY)
    {
      vertices: [corners[0]!, corners[5]!, corners[1]!],
      normal: { x: 0, y: -1, z: 0 },
    },
    {
      vertices: [corners[0]!, corners[4]!, corners[5]!],
      normal: { x: 0, y: -1, z: 0 },
    },
    // Back face (y = halfY)
    {
      vertices: [corners[2]!, corners[6]!, corners[7]!],
      normal: { x: 0, y: 1, z: 0 },
    },
    {
      vertices: [corners[2]!, corners[7]!, corners[3]!],
      normal: { x: 0, y: 1, z: 0 },
    },
    // Left face (x = -halfX)
    {
      vertices: [corners[0]!, corners[3]!, corners[7]!],
      normal: { x: -1, y: 0, z: 0 },
    },
    {
      vertices: [corners[0]!, corners[7]!, corners[4]!],
      normal: { x: -1, y: 0, z: 0 },
    },
    // Right face (x = halfX)
    {
      vertices: [corners[1]!, corners[6]!, corners[2]!],
      normal: { x: 1, y: 0, z: 0 },
    },
    {
      vertices: [corners[1]!, corners[5]!, corners[6]!],
      normal: { x: 1, y: 0, z: 0 },
    },
  ]

  return triangles
}

/**
 * Creates STEP faces from GLTF triangles
 */
function createStepFacesFromTriangles(
  repo: Repository,
  triangles: GLTFTriangle[],
): Ref<AdvancedFace>[] {
  const faces: Ref<AdvancedFace>[] = []

  for (const triangle of triangles) {
    // Create vertices for triangle
    const v1 = repo.add(
      new VertexPoint(
        "",
        repo.add(
          new CartesianPoint(
            "",
            triangle.vertices[0]!.x,
            triangle.vertices[0]!.y,
            triangle.vertices[0]!.z,
          ),
        ),
      ),
    )
    const v2 = repo.add(
      new VertexPoint(
        "",
        repo.add(
          new CartesianPoint(
            "",
            triangle.vertices[1]!.x,
            triangle.vertices[1]!.y,
            triangle.vertices[1]!.z,
          ),
        ),
      ),
    )
    const v3 = repo.add(
      new VertexPoint(
        "",
        repo.add(
          new CartesianPoint(
            "",
            triangle.vertices[2]!.x,
            triangle.vertices[2]!.y,
            triangle.vertices[2]!.z,
          ),
        ),
      ),
    )

    // Create edges between vertices
    const p1 = v1.resolve(repo).pnt.resolve(repo)
    const p2 = v2.resolve(repo).pnt.resolve(repo)
    const p3 = v3.resolve(repo).pnt.resolve(repo)

    const createEdge = (
      vStart: Ref<VertexPoint>,
      vEnd: Ref<VertexPoint>,
    ): Ref<EdgeCurve> => {
      const pStart = vStart.resolve(repo).pnt.resolve(repo)
      const pEnd = vEnd.resolve(repo).pnt.resolve(repo)
      const dir = repo.add(
        new Direction(
          "",
          pEnd.x - pStart.x,
          pEnd.y - pStart.y,
          pEnd.z - pStart.z,
        ),
      )
      const vec = repo.add(new Vector("", dir, 1))
      const line = repo.add(new Line("", vStart.resolve(repo).pnt, vec))
      return repo.add(new EdgeCurve("", vStart, vEnd, line, true))
    }

    const edge1 = createEdge(v1, v2)
    const edge2 = createEdge(v2, v3)
    const edge3 = createEdge(v3, v1)

    // Create edge loop for triangle
    const edgeLoop = repo.add(
      new EdgeLoop("", [
        repo.add(new OrientedEdge("", edge1, true)),
        repo.add(new OrientedEdge("", edge2, true)),
        repo.add(new OrientedEdge("", edge3, true)),
      ]),
    )

    // Create planar surface using triangle normal
    const normalDir = repo.add(
      new Direction(
        "",
        triangle.normal.x,
        triangle.normal.y,
        triangle.normal.z,
      ),
    )

    // Use first vertex as origin, calculate reference direction from first edge
    const refX = p2.x - p1.x
    const refY = p2.y - p1.y
    const refZ = p2.z - p1.z
    const refDir = repo.add(new Direction("", refX, refY, refZ))

    const placement = repo.add(
      new Axis2Placement3D("", v1.resolve(repo).pnt, normalDir, refDir),
    )
    const plane = repo.add(new Plane("", placement))

    // Create face
    const face = repo.add(
      new AdvancedFace(
        "",
        [repo.add(new FaceOuterBound("", edgeLoop, true))],
        plane,
        true,
      ),
    )
    faces.push(face)
  }

  return faces
}

/**
 * Converts circuit JSON to STEP format, creating holes in a PCB board
 */
export async function circuitJsonToStep(
  circuitJson: CircuitJson,
  options: CircuitJsonToStepOptions = {},
): Promise<string> {
  const repo = new Repository()

  // Extract pcb_board and holes from circuit JSON
  const pcbBoard = circuitJson.find((item) => item.type === "pcb_board")
  const holes: any[] = circuitJson.filter(
    (item) => item.type === "pcb_hole" || item.type === "pcb_plated_hole",
  )

  // Get dimensions from pcb_board or options
  const boardWidth = options.boardWidth ?? pcbBoard?.width
  const boardHeight = options.boardHeight ?? pcbBoard?.height
  const boardThickness = options.boardThickness ?? pcbBoard?.thickness ?? 1.6
  const productName = options.productName ?? "PCB"

  if (!boardWidth || !boardHeight) {
    throw new Error(
      "Board dimensions not found. Either provide boardWidth and boardHeight in options, or include a pcb_board in the circuit JSON with width and height properties.",
    )
  }

  // Product structure (required for STEP validation)
  const appContext = repo.add(
    new ApplicationContext(
      "core data for automotive mechanical design processes",
    ),
  )
  repo.add(
    new ApplicationProtocolDefinition(
      "international standard",
      "automotive_design",
      2010,
      appContext,
    ),
  )
  const productContext = repo.add(
    new ProductContext("", appContext, "mechanical"),
  )
  const product = repo.add(
    new Product(productName, productName, "", [productContext]),
  )
  const productDefContext = repo.add(
    new ProductDefinitionContext("part definition", appContext, "design"),
  )
  const productDefFormation = repo.add(
    new ProductDefinitionFormation("", "", product),
  )
  const productDef = repo.add(
    new ProductDefinition("", "", productDefFormation, productDefContext),
  )
  const productDefShape = repo.add(
    new ProductDefinitionShape("", "", productDef),
  )

  // Representation context
  const lengthUnit = repo.add(
    new Unknown("", [
      "( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.) )",
    ]),
  )
  const angleUnit = repo.add(
    new Unknown("", [
      "( NAMED_UNIT(*) PLANE_ANGLE_UNIT() SI_UNIT($,.RADIAN.) )",
    ]),
  )
  const solidAngleUnit = repo.add(
    new Unknown("", [
      "( NAMED_UNIT(*) SI_UNIT($,.STERADIAN.) SOLID_ANGLE_UNIT() )",
    ]),
  )
  const uncertainty = repo.add(
    new Unknown("UNCERTAINTY_MEASURE_WITH_UNIT", [
      `LENGTH_MEASURE(1.E-07)`,
      `${lengthUnit}`,
      `'distance_accuracy_value'`,
      `'Maximum Tolerance'`,
    ]),
  )
  const geomContext = repo.add(
    new Unknown("", [
      `( GEOMETRIC_REPRESENTATION_CONTEXT(3) GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((${uncertainty})) GLOBAL_UNIT_ASSIGNED_CONTEXT((${lengthUnit},${angleUnit},${solidAngleUnit})) REPRESENTATION_CONTEXT('${productName}','3D') )`,
    ]),
  )

  // Create board vertices based on outline or rectangular shape
  const outline = pcbBoard?.outline
  let bottomVertices: Ref<VertexPoint>[]
  let topVertices: Ref<VertexPoint>[]

  if (outline && Array.isArray(outline) && outline.length >= 3) {
    // Use custom outline
    bottomVertices = outline.map((point) =>
      repo.add(
        new VertexPoint(
          "",
          repo.add(new CartesianPoint("", point.x, point.y, 0)),
        ),
      ),
    )
    topVertices = outline.map((point) =>
      repo.add(
        new VertexPoint(
          "",
          repo.add(new CartesianPoint("", point.x, point.y, boardThickness)),
        ),
      ),
    )
  } else {
    // Fall back to rectangular shape (8 corners of rectangular prism)
    const corners = [
      [0, 0, 0],
      [boardWidth, 0, 0],
      [boardWidth, boardHeight, 0],
      [0, boardHeight, 0],
      [0, 0, boardThickness],
      [boardWidth, 0, boardThickness],
      [boardWidth, boardHeight, boardThickness],
      [0, boardHeight, boardThickness],
    ]
    const vertices = corners.map(([x, y, z]) =>
      repo.add(
        new VertexPoint("", repo.add(new CartesianPoint("", x!, y!, z!))),
      ),
    )
    bottomVertices = [vertices[0]!, vertices[1]!, vertices[2]!, vertices[3]!]
    topVertices = [vertices[4]!, vertices[5]!, vertices[6]!, vertices[7]!]
  }

  // Helper to create edge between vertices
  function createEdge(
    v1: Ref<VertexPoint>,
    v2: Ref<VertexPoint>,
  ): Ref<EdgeCurve> {
    const p1 = v1.resolve(repo).pnt.resolve(repo)
    const p2 = v2.resolve(repo).pnt.resolve(repo)
    const dir = repo.add(
      new Direction("", p2.x - p1.x, p2.y - p1.y, p2.z - p1.z),
    )
    const vec = repo.add(new Vector("", dir, 1))
    const line = repo.add(new Line("", v1.resolve(repo).pnt, vec))
    return repo.add(new EdgeCurve("", v1, v2, line, true))
  }

  // Create board edges
  const bottomEdges: Ref<EdgeCurve>[] = []
  const topEdges: Ref<EdgeCurve>[] = []
  const verticalEdges: Ref<EdgeCurve>[] = []

  // Bottom edges (connect vertices in a loop)
  for (let i = 0; i < bottomVertices.length; i++) {
    const v1 = bottomVertices[i]!
    const v2 = bottomVertices[(i + 1) % bottomVertices.length]!
    bottomEdges.push(createEdge(v1, v2))
  }

  // Top edges (connect vertices in a loop)
  for (let i = 0; i < topVertices.length; i++) {
    const v1 = topVertices[i]!
    const v2 = topVertices[(i + 1) % topVertices.length]!
    topEdges.push(createEdge(v1, v2))
  }

  // Vertical edges (connect bottom to top)
  for (let i = 0; i < bottomVertices.length; i++) {
    verticalEdges.push(createEdge(bottomVertices[i]!, topVertices[i]!))
  }

  const origin = repo.add(new CartesianPoint("", 0, 0, 0))
  const xDir = repo.add(new Direction("", 1, 0, 0))
  const yDir = repo.add(new Direction("", 0, 1, 0))
  const zDir = repo.add(new Direction("", 0, 0, 1))

  // Bottom face (z=0, normal pointing down)
  const bottomFrame = repo.add(
    new Axis2Placement3D(
      "",
      origin,
      repo.add(new Direction("", 0, 0, -1)),
      xDir,
    ),
  )
  const bottomPlane = repo.add(new Plane("", bottomFrame))
  const bottomLoop = repo.add(
    new EdgeLoop(
      "",
      bottomEdges.map((edge) => repo.add(new OrientedEdge("", edge, true))),
    ),
  )

  // Create holes in bottom face
  const bottomHoleLoops: Ref<FaceBound>[] = []
  for (const hole of holes) {
    // Check shape (pcb_hole uses hole_shape, pcb_plated_hole uses shape)
    const holeShape = hole.hole_shape || hole.shape
    if (holeShape === "circle") {
      const holeX = typeof hole.x === "number" ? hole.x : (hole.x as any).value
      const holeY = typeof hole.y === "number" ? hole.y : (hole.y as any).value
      const radius = hole.hole_diameter / 2

      const holeCenter = repo.add(new CartesianPoint("", holeX, holeY, 0))
      const holeVertex = repo.add(
        new VertexPoint(
          "",
          repo.add(new CartesianPoint("", holeX + radius, holeY, 0)),
        ),
      )
      const holePlacement = repo.add(
        new Axis2Placement3D(
          "",
          holeCenter,
          repo.add(new Direction("", 0, 0, -1)),
          xDir,
        ),
      )
      const holeCircle = repo.add(new Circle("", holePlacement, radius))
      const holeEdge = repo.add(
        new EdgeCurve("", holeVertex, holeVertex, holeCircle, true),
      )
      const holeLoop = repo.add(
        new EdgeLoop("", [repo.add(new OrientedEdge("", holeEdge, false))]),
      )
      bottomHoleLoops.push(repo.add(new FaceBound("", holeLoop, true)))
    }
  }

  const bottomFace = repo.add(
    new AdvancedFace(
      "",
      [
        repo.add(new FaceOuterBound("", bottomLoop, true)),
        ...bottomHoleLoops,
      ] as any,
      bottomPlane,
      true,
    ),
  )

  // Top face (z=boardThickness, normal pointing up)
  const topOrigin = repo.add(new CartesianPoint("", 0, 0, boardThickness))
  const topFrame = repo.add(new Axis2Placement3D("", topOrigin, zDir, xDir))
  const topPlane = repo.add(new Plane("", topFrame))
  const topLoop = repo.add(
    new EdgeLoop(
      "",
      topEdges.map((edge) => repo.add(new OrientedEdge("", edge, false))),
    ),
  )

  // Create holes in top face
  const topHoleLoops: Ref<FaceBound>[] = []
  for (const hole of holes) {
    // Check shape (pcb_hole uses hole_shape, pcb_plated_hole uses shape)
    const holeShape = hole.hole_shape || hole.shape
    if (holeShape === "circle") {
      const holeX = typeof hole.x === "number" ? hole.x : (hole.x as any).value
      const holeY = typeof hole.y === "number" ? hole.y : (hole.y as any).value
      const radius = hole.hole_diameter / 2

      const holeCenter = repo.add(
        new CartesianPoint("", holeX, holeY, boardThickness),
      )
      const holeVertex = repo.add(
        new VertexPoint(
          "",
          repo.add(
            new CartesianPoint("", holeX + radius, holeY, boardThickness),
          ),
        ),
      )
      const holePlacement = repo.add(
        new Axis2Placement3D("", holeCenter, zDir, xDir),
      )
      const holeCircle = repo.add(new Circle("", holePlacement, radius))
      const holeEdge = repo.add(
        new EdgeCurve("", holeVertex, holeVertex, holeCircle, true),
      )
      const holeLoop = repo.add(
        new EdgeLoop("", [repo.add(new OrientedEdge("", holeEdge, true))]),
      )
      topHoleLoops.push(repo.add(new FaceBound("", holeLoop, true)))
    }
  }

  const topFace = repo.add(
    new AdvancedFace(
      "",
      [repo.add(new FaceOuterBound("", topLoop, true)), ...topHoleLoops] as any,
      topPlane,
      true,
    ),
  )

  // Create side faces (one for each edge of the outline)
  const sideFaces: Ref<AdvancedFace>[] = []
  for (let i = 0; i < bottomEdges.length; i++) {
    const nextI = (i + 1) % bottomEdges.length

    // Get points for this side face
    const bottomV1Pnt = bottomVertices[i]!.resolve(repo).pnt
    const bottomV2Pnt = bottomVertices[nextI]!.resolve(repo).pnt
    const bottomV1 = bottomV1Pnt.resolve(repo)
    const bottomV2 = bottomV2Pnt.resolve(repo)

    // Calculate edge direction and outward normal
    const edgeDir = {
      x: bottomV2.x - bottomV1.x,
      y: bottomV2.y - bottomV1.y,
      z: 0,
    }
    // Normal is perpendicular (rotate 90 degrees clockwise in XY plane for outward facing)
    const normalDir = repo.add(new Direction("", edgeDir.y, -edgeDir.x, 0))

    // Reference direction along the edge
    const refDir = repo.add(new Direction("", edgeDir.x, edgeDir.y, 0))

    const sideFrame = repo.add(
      new Axis2Placement3D("", bottomV1Pnt, normalDir, refDir),
    )
    const sidePlane = repo.add(new Plane("", sideFrame))
    const sideLoop = repo.add(
      new EdgeLoop("", [
        repo.add(new OrientedEdge("", bottomEdges[i]!, true)),
        repo.add(new OrientedEdge("", verticalEdges[nextI]!, true)),
        repo.add(new OrientedEdge("", topEdges[i]!, false)),
        repo.add(new OrientedEdge("", verticalEdges[i]!, false)),
      ]),
    )
    const sideFace = repo.add(
      new AdvancedFace(
        "",
        [repo.add(new FaceOuterBound("", sideLoop, true))],
        sidePlane,
        true,
      ),
    )
    sideFaces.push(sideFace)
  }

  // Create cylindrical faces for holes
  const holeCylindricalFaces: Ref<AdvancedFace>[] = []
  for (const hole of holes) {
    const holeShape = hole.hole_shape || hole.shape
    if (holeShape === "circle") {
      const holeX = typeof hole.x === "number" ? hole.x : (hole.x as any).value
      const holeY = typeof hole.y === "number" ? hole.y : (hole.y as any).value
      const radius = hole.hole_diameter / 2

      // Create circular edges at bottom and top
      const bottomHoleCenter = repo.add(new CartesianPoint("", holeX, holeY, 0))
      const bottomHoleVertex = repo.add(
        new VertexPoint(
          "",
          repo.add(new CartesianPoint("", holeX + radius, holeY, 0)),
        ),
      )
      const bottomHolePlacement = repo.add(
        new Axis2Placement3D(
          "",
          bottomHoleCenter,
          repo.add(new Direction("", 0, 0, -1)),
          xDir,
        ),
      )
      const bottomHoleCircle = repo.add(
        new Circle("", bottomHolePlacement, radius),
      )
      const bottomHoleEdge = repo.add(
        new EdgeCurve(
          "",
          bottomHoleVertex,
          bottomHoleVertex,
          bottomHoleCircle,
          true,
        ),
      )

      const topHoleCenter = repo.add(
        new CartesianPoint("", holeX, holeY, boardThickness),
      )
      const topHoleVertex = repo.add(
        new VertexPoint(
          "",
          repo.add(
            new CartesianPoint("", holeX + radius, holeY, boardThickness),
          ),
        ),
      )
      const topHolePlacement = repo.add(
        new Axis2Placement3D("", topHoleCenter, zDir, xDir),
      )
      const topHoleCircle = repo.add(new Circle("", topHolePlacement, radius))
      const topHoleEdge = repo.add(
        new EdgeCurve("", topHoleVertex, topHoleVertex, topHoleCircle, true),
      )

      // Create edge loop for cylindrical surface
      const holeCylinderLoop = repo.add(
        new EdgeLoop("", [
          repo.add(new OrientedEdge("", bottomHoleEdge, true)),
          repo.add(new OrientedEdge("", topHoleEdge, false)),
        ]),
      )

      // Create cylindrical surface for the hole (axis along Z)
      const holeCylinderPlacement = repo.add(
        new Axis2Placement3D("", bottomHoleCenter, zDir, xDir),
      )
      const holeCylinderSurface = repo.add(
        new CylindricalSurface("", holeCylinderPlacement, radius),
      )
      const holeCylinderFace = repo.add(
        new AdvancedFace(
          "",
          [repo.add(new FaceOuterBound("", holeCylinderLoop, true))],
          holeCylinderSurface,
          false,
        ),
      )
      holeCylindricalFaces.push(holeCylinderFace)
    }
  }

  // Collect all faces
  const allFaces = [bottomFace, topFace, ...sideFaces, ...holeCylindricalFaces]

  // Create closed shell and solid
  const shell = repo.add(new ClosedShell("", allFaces))
  const solid = repo.add(new ManifoldSolidBrep(productName, shell))

  // Array to hold all solids (board + optional components)
  const allSolids: Ref<ManifoldSolidBrep>[] = [solid]

  // Generate component mesh if requested
  if (options.includeComponents) {
    try {
      // Convert circuit JSON to 3D scene
      const scene3d = await convertCircuitJsonTo3D(
        circuitJson.filter((e) => e.type !== "pcb_board"),
        {
          boardThickness,
        },
      )

      // Extract or generate triangles from component boxes
      const allTriangles: GLTFTriangle[] = []
      for (const box of scene3d.boxes) {
        if (box.mesh && "triangles" in box.mesh) {
          allTriangles.push(...box.mesh.triangles)
        } else {
          // Generate simple box mesh for this component
          const boxTriangles = createBoxTriangles(box)
          allTriangles.push(...boxTriangles)
        }
      }

      // Create STEP faces from triangles if we have any
      if (allTriangles.length > 0) {
        // Transform triangles from GLTF XZ plane (Y=up) to STEP XY plane (Z=up)
        const transformedTriangles = allTriangles.map((tri) => ({
          vertices: tri.vertices.map((v) => ({
            x: v.x,
            y: v.z, // GLTF Z becomes STEP Y
            z: v.y, // GLTF Y becomes STEP Z
          })),
          normal: {
            x: tri.normal.x,
            y: tri.normal.z, // GLTF Z becomes STEP Y
            z: tri.normal.y, // GLTF Y becomes STEP Z
          },
        }))
        const componentFaces = createStepFacesFromTriangles(
          repo,
          transformedTriangles,
        )

        // Create closed shell and solid for components
        const componentShell = repo.add(
          new ClosedShell("", componentFaces as any),
        )
        const componentSolid = repo.add(
          new ManifoldSolidBrep("Components", componentShell),
        )
        allSolids.push(componentSolid)
      }
    } catch (error) {
      console.warn("Failed to generate component mesh:", error)
      // Continue without components if generation fails
    }
  }

  // Add presentation/styling for all solids
  const styledItems: Ref<StyledItem>[] = []

  for (const solidRef of allSolids) {
    const color = repo.add(new ColourRgb("", 0.2, 0.6, 0.2))
    const fillColor = repo.add(new FillAreaStyleColour("", color))
    const fillStyle = repo.add(new FillAreaStyle("", [fillColor]))
    const surfaceFill = repo.add(new SurfaceStyleFillArea(fillStyle))
    const surfaceSide = repo.add(new SurfaceSideStyle("", [surfaceFill]))
    const surfaceUsage = repo.add(new SurfaceStyleUsage(".BOTH.", surfaceSide))
    const presStyle = repo.add(new PresentationStyleAssignment([surfaceUsage]))
    const styledItem = repo.add(new StyledItem("", [presStyle], solidRef))
    styledItems.push(styledItem)
  }

  repo.add(
    new MechanicalDesignGeometricPresentationRepresentation(
      "",
      styledItems,
      geomContext,
    ),
  )

  // Shape representation with all solids
  const shapeRep = repo.add(
    new AdvancedBrepShapeRepresentation(productName, allSolids, geomContext),
  )
  repo.add(new ShapeDefinitionRepresentation(productDefShape, shapeRep))

  // Generate and return STEP file text
  return repo.toPartFile({ name: productName })
}
