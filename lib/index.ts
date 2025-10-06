import type { PcbHole } from "circuit-json"
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

export interface CircuitJsonToStepOptions {
  /** Board width in mm (optional if pcb_board is present) */
  boardWidth?: number
  /** Board height in mm (optional if pcb_board is present) */
  boardHeight?: number
  /** Board thickness in mm (default: 1.6mm or from pcb_board) */
  boardThickness?: number
  /** Product name (default: "PCB") */
  productName?: string
}

/**
 * Converts circuit JSON to STEP format, creating holes in a PCB board
 */
export function circuitJsonToStep(
  circuitJson: any[],
  options: CircuitJsonToStepOptions = {},
): string {
  const repo = new Repository()

  // Extract pcb_board and holes from circuit JSON
  const pcbBoard = circuitJson.find((item) => item.type === "pcb_board")
  const holes: PcbHole[] = circuitJson.filter((item) => item.type === "pcb_hole")

  // Get dimensions from pcb_board or options
  const boardWidth = options.boardWidth ?? pcbBoard?.width
  const boardHeight = options.boardHeight ?? pcbBoard?.height
  const boardThickness = options.boardThickness ?? pcbBoard?.thickness ?? 1.6
  const productName = options.productName ?? "PCB"

  if (!boardWidth || !boardHeight) {
    throw new Error(
      "Board dimensions not found. Either provide boardWidth and boardHeight in options, or include a pcb_board in the circuit JSON with width and height properties."
    )
  }

  // Product structure (required for STEP validation)
  const appContext = repo.add(
    new ApplicationContext("core data for automotive mechanical design processes"),
  )
  repo.add(
    new ApplicationProtocolDefinition(
      "international standard",
      "automotive_design",
      2010,
      appContext,
    ),
  )
  const productContext = repo.add(new ProductContext("", appContext, "mechanical"))
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
  const productDefShape = repo.add(new ProductDefinitionShape("", "", productDef))

  // Representation context
  const lengthUnit = repo.add(
    new Unknown("", ["( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.) )"]),
  )
  const angleUnit = repo.add(
    new Unknown("", ["( NAMED_UNIT(*) PLANE_ANGLE_UNIT() SI_UNIT($,.RADIAN.) )"]),
  )
  const solidAngleUnit = repo.add(
    new Unknown("", ["( NAMED_UNIT(*) SI_UNIT($,.STERADIAN.) SOLID_ANGLE_UNIT() )"]),
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

  // Create board vertices (8 corners of rectangular prism)
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
    repo.add(new VertexPoint("", repo.add(new CartesianPoint("", x!, y!, z!)))),
  )

  // Helper to create edge between vertices
  function createEdge(v1: Ref<VertexPoint>, v2: Ref<VertexPoint>): Ref<EdgeCurve> {
    const p1 = v1.resolve(repo).pnt.resolve(repo)
    const p2 = v2.resolve(repo).pnt.resolve(repo)
    const dir = repo.add(
      new Direction("", p2.x - p1.x, p2.y - p1.y, p2.z - p1.z),
    )
    const vec = repo.add(new Vector("", dir, 1))
    const line = repo.add(new Line("", v1.resolve(repo).pnt, vec))
    return repo.add(new EdgeCurve("", v1, v2, line, true))
  }

  // Create board edges (12 edges of rectangular prism)
  const edges = [
    createEdge(vertices[0]!, vertices[1]!), // bottom
    createEdge(vertices[1]!, vertices[2]!),
    createEdge(vertices[2]!, vertices[3]!),
    createEdge(vertices[3]!, vertices[0]!),
    createEdge(vertices[4]!, vertices[5]!), // top
    createEdge(vertices[5]!, vertices[6]!),
    createEdge(vertices[6]!, vertices[7]!),
    createEdge(vertices[7]!, vertices[4]!),
    createEdge(vertices[0]!, vertices[4]!), // vertical
    createEdge(vertices[1]!, vertices[5]!),
    createEdge(vertices[2]!, vertices[6]!),
    createEdge(vertices[3]!, vertices[7]!),
  ]

  const origin = repo.add(new CartesianPoint("", 0, 0, 0))
  const xDir = repo.add(new Direction("", 1, 0, 0))
  const yDir = repo.add(new Direction("", 0, 1, 0))
  const zDir = repo.add(new Direction("", 0, 0, 1))

  // Bottom face (z=0, normal pointing down)
  const bottomFrame = repo.add(
    new Axis2Placement3D("", origin, repo.add(new Direction("", 0, 0, -1)), xDir),
  )
  const bottomPlane = repo.add(new Plane("", bottomFrame))
  const bottomLoop = repo.add(
    new EdgeLoop("", [
      repo.add(new OrientedEdge("", edges[0]!, true)),
      repo.add(new OrientedEdge("", edges[1]!, true)),
      repo.add(new OrientedEdge("", edges[2]!, true)),
      repo.add(new OrientedEdge("", edges[3]!, true)),
    ]),
  )

  // Create holes in bottom face
  const bottomHoleLoops: Ref<FaceBound>[] = []
  for (const hole of holes) {
    if (hole.hole_shape === "circle") {
      const holeX = typeof hole.x === "number" ? hole.x : (hole.x as any).value
      const holeY = typeof hole.y === "number" ? hole.y : (hole.y as any).value
      const radius = hole.hole_diameter / 2

      const holeCenter = repo.add(new CartesianPoint("", holeX, holeY, 0))
      const holeVertex = repo.add(
        new VertexPoint("", repo.add(new CartesianPoint("", holeX + radius, holeY, 0))),
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
      [repo.add(new FaceOuterBound("", bottomLoop, true)), ...bottomHoleLoops] as any,
      bottomPlane,
      true,
    ),
  )

  // Top face (z=boardThickness, normal pointing up)
  const topOrigin = repo.add(new CartesianPoint("", 0, 0, boardThickness))
  const topFrame = repo.add(new Axis2Placement3D("", topOrigin, zDir, xDir))
  const topPlane = repo.add(new Plane("", topFrame))
  const topLoop = repo.add(
    new EdgeLoop("", [
      repo.add(new OrientedEdge("", edges[4]!, false)),
      repo.add(new OrientedEdge("", edges[5]!, false)),
      repo.add(new OrientedEdge("", edges[6]!, false)),
      repo.add(new OrientedEdge("", edges[7]!, false)),
    ]),
  )

  // Create holes in top face
  const topHoleLoops: Ref<FaceBound>[] = []
  for (const hole of holes) {
    if (hole.hole_shape === "circle") {
      const holeX = typeof hole.x === "number" ? hole.x : (hole.x as any).value
      const holeY = typeof hole.y === "number" ? hole.y : (hole.y as any).value
      const radius = hole.hole_diameter / 2

      const holeCenter = repo.add(new CartesianPoint("", holeX, holeY, boardThickness))
      const holeVertex = repo.add(
        new VertexPoint("", repo.add(new CartesianPoint("", holeX + radius, holeY, boardThickness))),
      )
      const holePlacement = repo.add(
        new Axis2Placement3D(
          "",
          holeCenter,
          zDir,
          xDir,
        ),
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

  // Front face (y=0, normal pointing forward)
  const frontFrame = repo.add(
    new Axis2Placement3D("", origin, repo.add(new Direction("", 0, -1, 0)), xDir),
  )
  const frontPlane = repo.add(new Plane("", frontFrame))
  const frontLoop = repo.add(
    new EdgeLoop("", [
      repo.add(new OrientedEdge("", edges[0]!, true)),
      repo.add(new OrientedEdge("", edges[9]!, true)),
      repo.add(new OrientedEdge("", edges[4]!, false)),
      repo.add(new OrientedEdge("", edges[8]!, false)),
    ]),
  )
  const frontFace = repo.add(
    new AdvancedFace("", [repo.add(new FaceOuterBound("", frontLoop, true))], frontPlane, true),
  )

  // Back face (y=boardHeight, normal pointing backward)
  const backOrigin = repo.add(new CartesianPoint("", 0, boardHeight, 0))
  const backFrame = repo.add(new Axis2Placement3D("", backOrigin, yDir, xDir))
  const backPlane = repo.add(new Plane("", backFrame))
  const backLoop = repo.add(
    new EdgeLoop("", [
      repo.add(new OrientedEdge("", edges[2]!, true)),
      repo.add(new OrientedEdge("", edges[11]!, true)),
      repo.add(new OrientedEdge("", edges[6]!, false)),
      repo.add(new OrientedEdge("", edges[10]!, false)),
    ]),
  )
  const backFace = repo.add(
    new AdvancedFace("", [repo.add(new FaceOuterBound("", backLoop, true))], backPlane, true),
  )

  // Left face (x=0, normal pointing left)
  const leftFrame = repo.add(
    new Axis2Placement3D("", origin, repo.add(new Direction("", -1, 0, 0)), yDir),
  )
  const leftPlane = repo.add(new Plane("", leftFrame))
  const leftLoop = repo.add(
    new EdgeLoop("", [
      repo.add(new OrientedEdge("", edges[3]!, true)),
      repo.add(new OrientedEdge("", edges[8]!, true)),
      repo.add(new OrientedEdge("", edges[7]!, false)),
      repo.add(new OrientedEdge("", edges[11]!, false)),
    ]),
  )
  const leftFace = repo.add(
    new AdvancedFace("", [repo.add(new FaceOuterBound("", leftLoop, true))], leftPlane, true),
  )

  // Right face (x=boardWidth, normal pointing right)
  const rightOrigin = repo.add(new CartesianPoint("", boardWidth, 0, 0))
  const rightFrame = repo.add(new Axis2Placement3D("", rightOrigin, xDir, yDir))
  const rightPlane = repo.add(new Plane("", rightFrame))
  const rightLoop = repo.add(
    new EdgeLoop("", [
      repo.add(new OrientedEdge("", edges[1]!, true)),
      repo.add(new OrientedEdge("", edges[10]!, true)),
      repo.add(new OrientedEdge("", edges[5]!, false)),
      repo.add(new OrientedEdge("", edges[9]!, false)),
    ]),
  )
  const rightFace = repo.add(
    new AdvancedFace("", [repo.add(new FaceOuterBound("", rightLoop, true))], rightPlane, true),
  )

  // Collect all faces
  const allFaces = [bottomFace, topFace, frontFace, backFace, leftFace, rightFace]

  // Create closed shell and solid
  const shell = repo.add(new ClosedShell("", allFaces))
  const solid = repo.add(new ManifoldSolidBrep(productName, shell))

  // Add presentation/styling
  const color = repo.add(new ColourRgb("", 0.2, 0.6, 0.2))
  const fillColor = repo.add(new FillAreaStyleColour("", color))
  const fillStyle = repo.add(new FillAreaStyle("", [fillColor]))
  const surfaceFill = repo.add(new SurfaceStyleFillArea(fillStyle))
  const surfaceSide = repo.add(new SurfaceSideStyle("", [surfaceFill]))
  const surfaceUsage = repo.add(new SurfaceStyleUsage(".BOTH.", surfaceSide))
  const presStyle = repo.add(new PresentationStyleAssignment([surfaceUsage]))
  const styledItem = repo.add(new StyledItem("", [presStyle], solid))

  repo.add(
    new MechanicalDesignGeometricPresentationRepresentation(
      "",
      [styledItem],
      geomContext,
    ),
  )

  // Shape representation
  const shapeRep = repo.add(
    new AdvancedBrepShapeRepresentation(productName, [solid], geomContext),
  )
  repo.add(new ShapeDefinitionRepresentation(productDefShape, shapeRep))

  // Generate and return STEP file text
  return repo.toPartFile({ name: productName })
}
