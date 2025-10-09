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

export interface ComponentSolidInfo {
  solid: Ref<ManifoldSolidBrep>
  isSmallComponent: boolean
}

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
  
  // Only scale up very small components (likely resistors, small capacitors)
  // Keep larger components at their original size
  const isSmallComponent = size.x < 0.5 || size.y < 0.5 || size.z < 0.1
  
  const scaledSize = isSmallComponent ? {
    x: Math.max(size.x, 0.6),  // Make small components visible but not huge
    y: Math.max(size.y, 0.6),
    z: Math.max(size.z, 0.3)   // Give them some height
  } : size  // Keep original size for larger components
  
  const halfX = scaledSize.x / 2
  const halfY = scaledSize.y / 2
  const halfZ = scaledSize.z / 2

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
): Promise<ComponentSolidInfo[]> {
  const {
    repo,
    circuitJson,
    boardThickness,
    includeExternalMeshes = false,
  } = options
  const solidInfos: ComponentSolidInfo[] = []

  try {
    // Filter circuit JSON and handle external mesh URLs
    const filteredCircuitJson = circuitJson
      .filter((e) => e.type !== "pcb_board")
      .map((e) => {
        if (e.type === "cad_component") {
          if (!includeExternalMeshes) {
            // Remove model_*_url fields to avoid hanging on external model fetches
            return {
              ...e,
              model_3mf_url: undefined,
              model_obj_url: undefined,
              model_stl_url: undefined,
              model_glb_url: undefined,
              model_gltf_url: undefined,
            }
          } else {
            // When including external meshes, add default URLs for components that don't have them
            const cadComponent = e as any
            
            // If component doesn't have a mesh URL, try to provide a default based on footprint
            if (!cadComponent.model_obj_url && !cadComponent.model_gltf_url && !cadComponent.model_glb_url) {
              // Find the corresponding source component to determine type
              const sourceComponent = circuitJson.find(
                (item: any) => item.type === "source_component" && item.source_component_id === cadComponent.source_component_id
              ) as any
              
              if (sourceComponent?.ftype === "simple_resistor" && cadComponent.footprinter_string === "0603") {
                // Add default 0603 resistor mesh URL
                return {
                  ...cadComponent,
                  model_obj_url: "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=7c6a08e7d1684d6baaa0a14a0e497e91&pn=C22936&cachebust_origin="
                }
              }
            }
            
            return e
          }
        }
        return e
      })

    // Convert circuit JSON to 3D scene
    const scene3d = await convertCircuitJsonTo3D(filteredCircuitJson, {
      boardThickness,
      renderBoardTextures: false,
    })

    // Extract or generate triangles from component boxes - create separate solids for each component
    for (const box of scene3d.boxes) {
      const componentTriangles: GLTFTriangle[] = []
      
      // Check if external mesh exists and has triangles
      const hasValidExternalMesh = box.mesh && "triangles" in box.mesh && box.mesh.triangles.length > 0
      
      // Process all components with external meshes or fallback to box geometry
      if (hasValidExternalMesh) {
        componentTriangles.push(...box.mesh!.triangles)
      } else {
        // Generate fallback box mesh for components without external meshes
        const boxTriangles = createBoxTriangles(box)
        componentTriangles.push(...boxTriangles)
      }

      // Create STEP faces from triangles if we have any for this component
      if (componentTriangles.length > 0) {
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

        // Create closed shell and solid for this individual component
        const componentShell = repo.add(
          new ClosedShell("", componentFaces as any),
        )
        const componentSolid = repo.add(
          new ManifoldSolidBrep(`Component_${solidInfos.length}`, componentShell),
        )
        solidInfos.push({ solid: componentSolid, isSmallComponent: false })
      }
    }
  } catch (error) {
    console.warn("Failed to generate component mesh:", error)
    // Continue without components if generation fails
  }

  return solidInfos
}
