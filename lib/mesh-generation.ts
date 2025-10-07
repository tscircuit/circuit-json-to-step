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
  } = options
  const solids: Ref<ManifoldSolidBrep>[] = []

  try {
    // First, generate solids for pcb_components (component bodies on PCB surface)
    const pcbComponents = circuitJson.filter((e) => e.type === "pcb_component")
    for (const comp of pcbComponents) {
      const x = (comp as any).center.x
      const y = (comp as any).center.y
      const width = (comp as any).width
      const height = (comp as any).height

      // SMD component body height - using a more visible height for better rendering
      const componentHeight = 1.5 // mm - increased for better visibility in renderings
      const componentZ = boardThickness + componentHeight / 2

      const componentBox = {
        center: { x, y: componentZ, z: y }, // Transform to GLTF coords (Y=up)
        size: { x: width, y: componentHeight, z: height },
      }

      const componentTriangles = createBoxTriangles(componentBox)

      // Transform triangles from GLTF XZ plane (Y=up) to STEP XY plane (Z=up)
      const transformedTriangles = componentTriangles.map((tri) => ({
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
      const componentShell = repo.add(new ClosedShell("", componentFaces as any))
      const componentSolid = repo.add(
        new ManifoldSolidBrep(`Component_${(comp as any).pcb_component_id}`, componentShell),
      )
      solids.push(componentSolid)
    }

    // Generate solids for pcb_smtpads (rectangular pads on PCB surface)
    const smtpads = circuitJson.filter((e) => e.type === "pcb_smtpad")
    for (const pad of smtpads) {
      if ((pad as any).shape === "rect") {
        const x = (pad as any).x
        const y = (pad as any).y
        const width = (pad as any).width
        const height = (pad as any).height
        const padThickness = 0.035 // Standard SMT pad thickness in mm

        // Position pad on top surface of board
        const padZ = boardThickness + padThickness / 2

        const padBox = {
          center: { x, y: padZ, z: y }, // Transform to GLTF coords (Y=up)
          size: { x: width, y: padThickness, z: height },
        }

        const padTriangles = createBoxTriangles(padBox)

        // Transform triangles from GLTF XZ plane (Y=up) to STEP XY plane (Z=up)
        const transformedTriangles = padTriangles.map((tri) => ({
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

        const padFaces = createStepFacesFromTriangles(
          repo,
          transformedTriangles as any,
        )
        const padShell = repo.add(new ClosedShell("", padFaces as any))
        const padSolid = repo.add(
          new ManifoldSolidBrep(`SMTPad_${(pad as any).pcb_smtpad_id}`, padShell),
        )
        solids.push(padSolid)
      }
    }

    // Filter circuit JSON and optionally remove model URLs
    const filteredCircuitJson = circuitJson
      .filter((e) => e.type !== "pcb_board")
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
