import type { CircuitJson } from "circuit-json"
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
import { generateComponentMeshes } from "./mesh-generation"
import { mergeExternalStepModels } from "./step-model-merger"
import { normalizeStepNumericExponents } from "./step-text-utils"

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
  /** Include external model meshes from model_*_url fields (default: false). Only applicable when includeComponents is true. */
  includeExternalMeshes?: boolean
  /**
   * Pre-loaded STEP file contents, keyed by URL/path.
   * If a URL is found here, the content is used directly instead of fetching.
   * Useful for tests that need to load local files.
   */
  stepContents?: Record<string, string>
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

  // Get board center position (defaults to 0, 0 if not specified)
  const boardCenterX = pcbBoard?.center?.x ?? 0
  const boardCenterY = pcbBoard?.center?.y ?? 0

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
    // Use custom outline (points are already relative to board center)
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
    // Fall back to rectangular shape centered at (boardCenterX, boardCenterY)
    const halfWidth = boardWidth / 2
    const halfHeight = boardHeight / 2
    const corners = [
      [boardCenterX - halfWidth, boardCenterY - halfHeight, 0],
      [boardCenterX + halfWidth, boardCenterY - halfHeight, 0],
      [boardCenterX + halfWidth, boardCenterY + halfHeight, 0],
      [boardCenterX - halfWidth, boardCenterY + halfHeight, 0],
      [boardCenterX - halfWidth, boardCenterY - halfHeight, boardThickness],
      [boardCenterX + halfWidth, boardCenterY - halfHeight, boardThickness],
      [boardCenterX + halfWidth, boardCenterY + halfHeight, boardThickness],
      [boardCenterX - halfWidth, boardCenterY + halfHeight, boardThickness],
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

  let handledComponentIds = new Set<string>()
  let handledPcbComponentIds = new Set<string>()

  if (options.includeComponents && options.includeExternalMeshes) {
    const mergeResult = await mergeExternalStepModels({
      repo,
      circuitJson,
      boardThickness,
      stepContents: options.stepContents,
    })
    handledComponentIds = mergeResult.handledComponentIds
    handledPcbComponentIds = mergeResult.handledPcbComponentIds
    allSolids.push(...mergeResult.solids)
  }

  // Generate component mesh fallback if requested
  if (options.includeComponents) {
    const componentSolids = await generateComponentMeshes({
      repo,
      circuitJson,
      boardThickness,
      includeExternalMeshes: options.includeExternalMeshes,
      excludeCadComponentIds: handledComponentIds,
      excludePcbComponentIds: handledPcbComponentIds,
    })
    allSolids.push(...componentSolids)
  }

  // Add presentation/styling for all solids
  const styledItems: Ref<StyledItem>[] = []

  allSolids.forEach((solidRef, index) => {
    const isBoard = index === 0
    const [r, g, b] = isBoard ? [0.2, 0.6, 0.2] : [0.75, 0.75, 0.75]
    const color = repo.add(new ColourRgb("", r, g, b))
    const fillColor = repo.add(new FillAreaStyleColour("", color))
    const fillStyle = repo.add(new FillAreaStyle("", [fillColor]))
    const surfaceFill = repo.add(new SurfaceStyleFillArea(fillStyle))
    const surfaceSide = repo.add(new SurfaceSideStyle("", [surfaceFill]))
    const surfaceUsage = repo.add(new SurfaceStyleUsage(".BOTH.", surfaceSide))
    const presStyle = repo.add(new PresentationStyleAssignment([surfaceUsage]))
    const styledItem = repo.add(new StyledItem("", [presStyle], solidRef))
    styledItems.push(styledItem)
  })

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
  const stepText = repo.toPartFile({ name: productName })
  return normalizeStepNumericExponents(stepText)
}
