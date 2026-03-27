import type { CircuitJson } from "circuit-json"
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
 * Creates a proper B-Rep box solid in STEP format.
 * The box is defined by 8 vertices, 12 edges, and 6 rectangular faces,
 * forming a valid manifold closed shell.
 *
 * Input coordinates are in GLTF convention (Y=up).
 * This function converts to STEP convention (Z=up) internally.
 */
function createBRepBoxSolid(
  repo: Repository,
  box: {
    center: { x: number; y: number; z: number }
    size: { x: number; y: number; z: number }
  },
  label?: string,
): Ref<ManifoldSolidBrep> {
  // Transform from GLTF (Y=up) to STEP (Z=up): swap Y and Z
  const cx = box.center.x
  const cy = box.center.z // GLTF Z becomes STEP Y
  const cz = box.center.y // GLTF Y becomes STEP Z
  const sx = box.size.x
  const sy = box.size.z // GLTF Z becomes STEP Y
  const sz = box.size.y // GLTF Y becomes STEP Z

  const hx = sx / 2
  const hy = sy / 2
  const hz = sz / 2

  // 8 corners: bottom face (z=cz-hz) then top face (z=cz+hz)
  // Bottom: 0=(-x,-y,-z) 1=(+x,-y,-z) 2=(+x,+y,-z) 3=(-x,+y,-z)
  // Top:    4=(-x,-y,+z) 5=(+x,-y,+z) 6=(+x,+y,+z) 7=(-x,+y,+z)
  const pts: [number, number, number][] = [
    [cx - hx, cy - hy, cz - hz],
    [cx + hx, cy - hy, cz - hz],
    [cx + hx, cy + hy, cz - hz],
    [cx - hx, cy + hy, cz - hz],
    [cx - hx, cy - hy, cz + hz],
    [cx + hx, cy - hy, cz + hz],
    [cx + hx, cy + hy, cz + hz],
    [cx - hx, cy + hy, cz + hz],
  ]

  const verts = pts.map(([x, y, z]) =>
    repo.add(new VertexPoint("", repo.add(new CartesianPoint("", x!, y!, z!)))),
  )

  function mkEdge(
    a: Ref<VertexPoint>,
    b: Ref<VertexPoint>,
  ): Ref<EdgeCurve> {
    const pa = a.resolve(repo).pnt.resolve(repo)
    const pb = b.resolve(repo).pnt.resolve(repo)
    const dx = pb.x - pa.x
    const dy = pb.y - pa.y
    const dz = pb.z - pa.z
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
    const dir = repo.add(new Direction("", dx / len, dy / len, dz / len))
    const vec = repo.add(new Vector("", dir, len))
    const line = repo.add(new Line("", a.resolve(repo).pnt, vec))
    return repo.add(new EdgeCurve("", a, b, line, true))
  }

  // 12 edges
  // Bottom ring: 0-1, 1-2, 2-3, 3-0
  const be = [
    mkEdge(verts[0]!, verts[1]!),
    mkEdge(verts[1]!, verts[2]!),
    mkEdge(verts[2]!, verts[3]!),
    mkEdge(verts[3]!, verts[0]!),
  ]
  // Top ring: 4-5, 5-6, 6-7, 7-4
  const te = [
    mkEdge(verts[4]!, verts[5]!),
    mkEdge(verts[5]!, verts[6]!),
    mkEdge(verts[6]!, verts[7]!),
    mkEdge(verts[7]!, verts[4]!),
  ]
  // Vertical: 0-4, 1-5, 2-6, 3-7
  const ve = [
    mkEdge(verts[0]!, verts[4]!),
    mkEdge(verts[1]!, verts[5]!),
    mkEdge(verts[2]!, verts[6]!),
    mkEdge(verts[3]!, verts[7]!),
  ]

  function mkFace(
    loops: { edge: Ref<EdgeCurve>; fwd: boolean }[],
    nx: number,
    ny: number,
    nz: number,
    origin: Ref<VertexPoint>,
    rx: number,
    ry: number,
    rz: number,
  ): Ref<AdvancedFace> {
    const edgeLoop = repo.add(
      new EdgeLoop(
        "",
        loops.map((l) => repo.add(new OrientedEdge("", l.edge, l.fwd))),
      ),
    )
    const normal = repo.add(new Direction("", nx, ny, nz))
    const refDir = repo.add(new Direction("", rx, ry, rz))
    const placement = repo.add(
      new Axis2Placement3D("", origin.resolve(repo).pnt, normal, refDir),
    )
    const plane = repo.add(new Plane("", placement))
    return repo.add(
      new AdvancedFace(
        "",
        [repo.add(new FaceOuterBound("", edgeLoop, true))],
        plane,
        true,
      ),
    )
  }

  // Bottom face (z=-hz, normal -Z): loop 0→1→2→3→0
  const bottomFace = mkFace(
    [
      { edge: be[0]!, fwd: true },
      { edge: be[1]!, fwd: true },
      { edge: be[2]!, fwd: true },
      { edge: be[3]!, fwd: true },
    ],
    0, 0, -1,
    verts[0]!,
    1, 0, 0,
  )

  // Top face (z=+hz, normal +Z): loop 4→7→6→5→4 (CCW from above)
  const topFace = mkFace(
    [
      { edge: te[3]!, fwd: false },
      { edge: te[2]!, fwd: false },
      { edge: te[1]!, fwd: false },
      { edge: te[0]!, fwd: false },
    ],
    0, 0, 1,
    verts[4]!,
    1, 0, 0,
  )

  // Front face (y=-hy, normal -Y): loop 0→4→5→1→0
  const frontFace = mkFace(
    [
      { edge: ve[0]!, fwd: true },
      { edge: te[0]!, fwd: true },
      { edge: ve[1]!, fwd: false },
      { edge: be[0]!, fwd: false },
    ],
    0, -1, 0,
    verts[0]!,
    1, 0, 0,
  )

  // Back face (y=+hy, normal +Y): loop 2→6→7→3→2
  const backFace = mkFace(
    [
      { edge: ve[2]!, fwd: true },
      { edge: te[2]!, fwd: true },
      { edge: ve[3]!, fwd: false },
      { edge: be[2]!, fwd: false },
    ],
    0, 1, 0,
    verts[2]!,
    -1, 0, 0,
  )

  // Left face (x=-hx, normal -X): loop 3→7→4→0→3
  const leftFace = mkFace(
    [
      { edge: ve[3]!, fwd: true },
      { edge: te[3]!, fwd: true },
      { edge: ve[0]!, fwd: false },
      { edge: be[3]!, fwd: false },
    ],
    -1, 0, 0,
    verts[3]!,
    0, 1, 0,
  )

  // Right face (x=+hx, normal +X): loop 1→5→6→2→1
  const rightFace = mkFace(
    [
      { edge: ve[1]!, fwd: true },
      { edge: te[1]!, fwd: true },
      { edge: ve[2]!, fwd: false },
      { edge: be[1]!, fwd: false },
    ],
    1, 0, 0,
    verts[1]!,
    0, -1, 0,
  )

  const shell = repo.add(
    new ClosedShell("", [bottomFace, topFace, frontFace, backFace, leftFace, rightFace]),
  )
  return repo.add(new ManifoldSolidBrep(label ?? "Component", shell))
}

/**
 * Generates component meshes from circuit JSON and converts them to STEP solids.
 * Each component box becomes its own ManifoldSolidBrep for valid STEP topology.
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

    // Convert circuit JSON to 3D scene to get component boxes with size/position
    const scene3d = await convertCircuitJsonTo3D(filteredCircuitJson, {
      boardThickness,
      renderBoardTextures: false,
    })

    // Create one B-Rep box solid per component box
    for (const box of scene3d.boxes) {
      const solid = createBRepBoxSolid(repo, box, box.label ?? "Component")
      solids.push(solid)
    }
  } catch (error) {
    console.warn("Failed to generate component mesh:", error)
    // Continue without components if generation fails
  }

  return solids
}
