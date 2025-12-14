import type { CircuitJson } from "circuit-json"
import type { Triangle as GLTFTriangle } from "circuit-json-to-gltf"
import { convertCircuitJsonTo3D } from "circuit-json-to-gltf"
import type { Ref } from "stepts"
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

    // Convert circuit JSON to 3D scene
    const scene3d = await convertCircuitJsonTo3D(filteredCircuitJson, {
      boardThickness,
      renderBoardTextures: false,
    })

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
        transformedTriangles as any,
      )

      // Create closed shell and solid for components
      const componentShell = repo.add(
        new ClosedShell("", componentFaces as any),
      )
      const componentSolid = repo.add(
        new ManifoldSolidBrep("Components", componentShell),
      )
      solids.push(componentSolid)
    }
  } catch (error) {
    console.warn("Failed to generate component mesh:", error)
    // Continue without components if generation fails
  }

  return solids
}
