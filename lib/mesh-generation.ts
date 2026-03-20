import type { CircuitJson } from "circuit-json"
import type { Ref } from "stepts"
import type { Triangle as GLTFTriangle, Box3D } from "circuit-json-to-gltf"
import type { Repository } from "stepts"
import {
  AdvancedFace,
  Axis2Placement3D,
  CartesianPoint,
  ClosedShell,
  Direction,
  EdgeCurve,
  EdgeLoop,
  FaceOuterBound,
  Line,
  ManifoldSolidBrep,
  OrientedEdge,
  Plane,
  Vector,
  VertexPoint,
} from "stepts"

export interface MeshGenerationOptions {
  /** Repository to add STEP entities to */
  repo: Repository
  /** Circuit JSON elements to convert */
  circuitJson: CircuitJson
  /** Board thickness in mm */
  boardThickness: number
  /** Include external model meshes from model_*_url fields (default: false) */
  includeExternalMeshes?: boolean
  /** Cad component ids already handled by STEP merging */
  excludeCadComponentIds?: Set<string>
  /** PCB component ids already handled by STEP merging */
  excludePcbComponentIds?: Set<string>
  /** PCB component ids covered by cad_components with model_step_url */
  pcbComponentIdsWithStepUrl?: Set<string>
}

/**
 * Creates a proper B-Rep box solid in STEP format.
 * The box is defined by 8 vertices, 12 edges, and 6 rectangular faces,
 * forming a valid manifold closed shell.
 *
 * Coordinates are in STEP convention (Z=up). The box parameter uses
 * GLTF convention (Y=up), so we swap Y/Z during conversion.
 */
function createBRepBoxSolid(
  repo: Repository,
  box: {
    center: { x: number; y: number; z: number }
    size: { x: number; y: number; z: number }
  },
  label?: string,
): Ref<ManifoldSolidBrep> {
  // Transform from GLTF (Y=up) to STEP (Z=up)
  const center = { x: box.center.x, y: box.center.z, z: box.center.y }
  const size = { x: box.size.x, y: box.size.z, z: box.size.y }

  const halfX = size.x / 2
  const halfY = size.y / 2
  const halfZ = size.z / 2

  // 8 corners of the box
  // Bottom face (z = center.z - halfZ)
  //   0: (-x, -y, -z)  1: (+x, -y, -z)  2: (+x, +y, -z)  3: (-x, +y, -z)
  // Top face (z = center.z + halfZ)
  //   4: (-x, -y, +z)  5: (+x, -y, +z)  6: (+x, +y, +z)  7: (-x, +y, +z)
  const cornerCoords = [
    [center.x - halfX, center.y - halfY, center.z - halfZ],
    [center.x + halfX, center.y - halfY, center.z - halfZ],
    [center.x + halfX, center.y + halfY, center.z - halfZ],
    [center.x - halfX, center.y + halfY, center.z - halfZ],
    [center.x - halfX, center.y - halfY, center.z + halfZ],
    [center.x + halfX, center.y - halfY, center.z + halfZ],
    [center.x + halfX, center.y + halfY, center.z + halfZ],
    [center.x - halfX, center.y + halfY, center.z + halfZ],
  ]

  const vertices = cornerCoords.map(([x, y, z]) =>
    repo.add(new VertexPoint("", repo.add(new CartesianPoint("", x!, y!, z!)))),
  )

  // Helper to create an edge between two vertices
  function createEdge(
    v1: Ref<VertexPoint>,
    v2: Ref<VertexPoint>,
  ): Ref<EdgeCurve> {
    const p1 = v1.resolve(repo).pnt.resolve(repo)
    const p2 = v2.resolve(repo).pnt.resolve(repo)
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const dz = p2.z - p1.z
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz)
    const dir = repo.add(
      new Direction("", dx / length, dy / length, dz / length),
    )
    const vec = repo.add(new Vector("", dir, length))
    const line = repo.add(new Line("", v1.resolve(repo).pnt, vec))
    return repo.add(new EdgeCurve("", v1, v2, line, true))
  }

  // 12 edges of the box
  // Bottom face edges (0-1, 1-2, 2-3, 3-0)
  const bottomEdges = [
    createEdge(vertices[0]!, vertices[1]!),
    createEdge(vertices[1]!, vertices[2]!),
    createEdge(vertices[2]!, vertices[3]!),
    createEdge(vertices[3]!, vertices[0]!),
  ]
  // Top face edges (4-5, 5-6, 6-7, 7-4)
  const topEdges = [
    createEdge(vertices[4]!, vertices[5]!),
    createEdge(vertices[5]!, vertices[6]!),
    createEdge(vertices[6]!, vertices[7]!),
    createEdge(vertices[7]!, vertices[4]!),
  ]
  // Vertical edges (0-4, 1-5, 2-6, 3-7)
  const vertEdges = [
    createEdge(vertices[0]!, vertices[4]!),
    createEdge(vertices[1]!, vertices[5]!),
    createEdge(vertices[2]!, vertices[6]!),
    createEdge(vertices[3]!, vertices[7]!),
  ]

  // Helper to create a planar face
  function createFace(
    edges: { edge: Ref<EdgeCurve>; forward: boolean }[],
    normalX: number,
    normalY: number,
    normalZ: number,
    originVertex: Ref<VertexPoint>,
    refDirX: number,
    refDirY: number,
    refDirZ: number,
  ): Ref<AdvancedFace> {
    const orientedEdges = edges.map((e) =>
      repo.add(new OrientedEdge("", e.edge, e.forward)),
    )
    const loop = repo.add(new EdgeLoop("", orientedEdges))
    const normalDir = repo.add(new Direction("", normalX, normalY, normalZ))
    const refDir = repo.add(new Direction("", refDirX, refDirY, refDirZ))
    const placement = repo.add(
      new Axis2Placement3D(
        "",
        originVertex.resolve(repo).pnt,
        normalDir,
        refDir,
      ),
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

  // Bottom face (z = -halfZ, normal pointing down)
  // Loop: 0->1->2->3->0 (viewed from below, counterclockwise = clockwise from above)
  const bottomFace = createFace(
    [
      { edge: bottomEdges[0]!, forward: true },
      { edge: bottomEdges[1]!, forward: true },
      { edge: bottomEdges[2]!, forward: true },
      { edge: bottomEdges[3]!, forward: true },
    ],
    0,
    0,
    -1,
    vertices[0]!,
    1,
    0,
    0,
  )

  // Top face (z = +halfZ, normal pointing up)
  // Loop: 4->7->6->5->4 (viewed from above, counterclockwise)
  const topFace = createFace(
    [
      { edge: topEdges[3]!, forward: false },
      { edge: topEdges[2]!, forward: false },
      { edge: topEdges[1]!, forward: false },
      { edge: topEdges[0]!, forward: false },
    ],
    0,
    0,
    1,
    vertices[4]!,
    1,
    0,
    0,
  )

  // Front face (y = -halfY, normal pointing -Y)
  // Loop: 0->4->5->1->0
  const frontFace = createFace(
    [
      { edge: vertEdges[0]!, forward: true },
      { edge: topEdges[0]!, forward: true },
      { edge: vertEdges[1]!, forward: false },
      { edge: bottomEdges[0]!, forward: false },
    ],
    0,
    -1,
    0,
    vertices[0]!,
    1,
    0,
    0,
  )

  // Back face (y = +halfY, normal pointing +Y)
  // Loop: 2->6->7->3->2
  const backFace = createFace(
    [
      { edge: vertEdges[2]!, forward: true },
      { edge: topEdges[2]!, forward: true },
      { edge: vertEdges[3]!, forward: false },
      { edge: bottomEdges[2]!, forward: false },
    ],
    0,
    1,
    0,
    vertices[2]!,
    -1,
    0,
    0,
  )

  // Left face (x = -halfX, normal pointing -X)
  // Loop: 3->7->4->0->3
  const leftFace = createFace(
    [
      { edge: vertEdges[3]!, forward: true },
      { edge: topEdges[3]!, forward: true },
      { edge: vertEdges[0]!, forward: false },
      { edge: bottomEdges[3]!, forward: false },
    ],
    -1,
    0,
    0,
    vertices[3]!,
    0,
    -1,
    0,
  )

  // Right face (x = +halfX, normal pointing +X)
  // Loop: 1->5->6->2->1
  const rightFace = createFace(
    [
      { edge: vertEdges[1]!, forward: true },
      { edge: topEdges[1]!, forward: true },
      { edge: vertEdges[2]!, forward: false },
      { edge: bottomEdges[1]!, forward: false },
    ],
    1,
    0,
    0,
    vertices[1]!,
    0,
    1,
    0,
  )

  const allFaces = [
    bottomFace,
    topFace,
    frontFace,
    backFace,
    leftFace,
    rightFace,
  ]
  const shell = repo.add(new ClosedShell("", allFaces))
  return repo.add(new ManifoldSolidBrep(label ?? "Component", shell))
}

/**
 * Generates triangles for a box mesh (used for boxes with custom meshes)
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
 * Generates component meshes from circuit JSON and converts them to STEP solids
 *
 * By default, model_*_url fields are filtered out to prevent hanging on external
 * model fetches during conversion. Set includeExternalMeshes to true to allow
 * external model fetching.
 */
export async function generateComponentMeshes(
  options: MeshGenerationOptions,
): Promise<Ref<ManifoldSolidBrep>[]> {
  const {
    repo,
    circuitJson,
    boardThickness,
    includeExternalMeshes = false,
    excludeCadComponentIds,
    excludePcbComponentIds,
    pcbComponentIdsWithStepUrl,
  } = options
  const solids: Ref<ManifoldSolidBrep>[] = []
  try {
    // Filter circuit JSON and optionally remove model URLs
    const filteredCircuitJson = circuitJson
      .filter((e) => {
        if (e.type === "pcb_board") return false
        if (
          e.type === "cad_component" &&
          e.cad_component_id &&
          excludeCadComponentIds?.has(e.cad_component_id)
        ) {
          return false
        }
        if (
          e.type === "pcb_component" &&
          e.pcb_component_id &&
          excludePcbComponentIds?.has(e.pcb_component_id)
        ) {
          return false
        }
        // Skip cad_components that have model_step_url
        // (they should be handled by mergeExternalStepModels, not mesh generation)
        if (e.type === "cad_component" && e.model_step_url) {
          return false
        }
        // Skip cad_components whose pcb_component_id is covered by another cad_component with STEP URL
        if (
          e.type === "cad_component" &&
          e.pcb_component_id &&
          pcbComponentIdsWithStepUrl?.has(e.pcb_component_id)
        ) {
          return false
        }
        return true
      })
      .map((e) => {
        if (!includeExternalMeshes && e.type === "cad_component") {
          // Remove model_*_url fields to avoid hanging on external model fetches
          return {
            ...e,
            model_3mf_url: undefined,
            model_obj_url: undefined,
            model_stl_url: undefined,
            model_glb_url: undefined,
            model_gltf_url: undefined,
          }
        }
        return e
      })

    // Dynamically import circuit-json-to-gltf to avoid bundling native dependencies
    // Use a variable to prevent the bundler from statically analyzing the import
    const gltfModule = "circuit-json-to-gltf"
    const { convertCircuitJsonTo3D } = await import(
      /* @vite-ignore */ gltfModule
    )

    // Convert circuit JSON to 3D scene
    const scene3d = await convertCircuitJsonTo3D(filteredCircuitJson, {
      boardThickness,
      renderBoardTextures: false,
    })

    // Process each box individually
    for (const box of scene3d.boxes) {
      if (box.mesh && "triangles" in box.mesh) {
        // Box has a custom mesh - use triangle-based approach
        const meshTriangles = box.mesh.triangles
        if (meshTriangles.length > 0) {
          // Transform triangles from GLTF XZ plane (Y=up) to STEP XY plane (Z=up)
          const transformedTriangles = meshTriangles.map(
            (tri: GLTFTriangle) => ({
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
            }),
          )
          const componentFaces = createStepFacesFromTriangles(
            repo,
            transformedTriangles as any,
          )
          const componentShell = repo.add(
            new ClosedShell("", componentFaces as any),
          )
          const componentSolid = repo.add(
            new ManifoldSolidBrep(box.label ?? "Component", componentShell),
          )
          solids.push(componentSolid)
        }
      } else {
        // Simple box - create proper B-Rep solid with 6 rectangular faces
        const boxSolid = createBRepBoxSolid(repo, box, box.label)
        solids.push(boxSolid)
      }
    }
  } catch (error) {
    console.warn("Failed to generate component mesh:", error)
    // Continue without components if generation fails
  }

  return solids
}
