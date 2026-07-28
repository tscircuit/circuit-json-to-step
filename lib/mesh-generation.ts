import type { CircuitJson } from "circuit-json"
import type { Repository } from "stepts"
import { getCircuitJsonToGltfModule } from "./get-circuit-json-to-gltf-module"
import { createSceneBoxSolid } from "./scene-box-to-step"
import type { GeneratedSceneSolid, SceneBox } from "./scene-geometry"

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
 * Generates component meshes from circuit JSON and converts them to STEP solids
 *
 * By default, model_*_url fields are filtered out to prevent hanging on external
 * model fetches during conversion. Set includeExternalMeshes to true to allow
 * external model fetching.
 */
export async function generateComponentMeshes(
  options: MeshGenerationOptions,
): Promise<GeneratedSceneSolid[]> {
  const {
    repo,
    circuitJson,
    boardThickness,
    includeExternalMeshes = false,
    excludeCadComponentIds,
    excludePcbComponentIds,
    pcbComponentIdsWithStepUrl,
  } = options

  const solids: GeneratedSceneSolid[] = []

  try {
    const filteredCircuitJson = circuitJson
      .filter((element) => {
        if (element.type === "pcb_board") return false

        if (
          element.type === "cad_component" &&
          element.cad_component_id &&
          excludeCadComponentIds?.has(element.cad_component_id)
        ) {
          return false
        }

        if (
          element.type === "pcb_component" &&
          element.pcb_component_id &&
          excludePcbComponentIds?.has(element.pcb_component_id)
        ) {
          return false
        }

        if (element.type === "cad_component" && element.model_step_url) {
          return false
        }

        if (
          element.type === "cad_component" &&
          element.pcb_component_id &&
          pcbComponentIdsWithStepUrl?.has(element.pcb_component_id)
        ) {
          return false
        }

        return true
      })
      .map((element) => {
        if (!includeExternalMeshes && element.type === "cad_component") {
          return {
            ...element,
            model_3mf_url: undefined,
            model_obj_url: undefined,
            model_stl_url: undefined,
            model_glb_url: undefined,
            model_gltf_url: undefined,
          }
        }

        return element
      })

    const { convertCircuitJsonTo3D } = await getCircuitJsonToGltfModule()

    const scene3d = await convertCircuitJsonTo3D(filteredCircuitJson, {
      boardThickness,
      renderBoardTextures: false,
    })

    for (const box of scene3d.boxes as SceneBox[]) {
      solids.push(createSceneBoxSolid(repo, box))
    }

    // pcb_components that have no cad_component entry don't get a box from
    // convertCircuitJsonTo3D. Generate fallback boxes from their footprint dims.
    // Any pcb_component with a cad_component is considered covered — the designer
    // explicitly specified a 3D model (or bounding box), so we don't override it.
    const cadCoveredIds = new Set<string>(
      (filteredCircuitJson as any[])
        .filter((e) => e.type === "cad_component" && e.pcb_component_id)
        .map((e) => e.pcb_component_id as string),
    )

    for (const box of createFallbackBoxesForUncoveredComponents(
      filteredCircuitJson as any[],
      cadCoveredIds,
      boardThickness,
    )) {
      solids.push(createSceneBoxSolid(repo, box))
    }
  } catch (error) {
    console.warn("Failed to generate component mesh:", error)
  }

  return solids
}

const COMPONENT_THICKNESS_MM = 0.6

export function createFallbackBoxesForUncoveredComponents(
  circuitJson: any[],
  cadCoveredIds: Set<string>,
  boardThickness: number,
): SceneBox[] {
  const sourceNames = new Map<string, string>()
  for (const e of circuitJson) {
    if (e.type === "source_component" && e.source_component_id && e.name) {
      sourceNames.set(e.source_component_id, e.name)
    }
  }

  const boxes: SceneBox[] = []
  for (const e of circuitJson) {
    if (e.type !== "pcb_component") continue
    if (cadCoveredIds.has(e.pcb_component_id)) continue
    // obstructs_within_bounds marks a layout-group placeholder, not a physical part
    if (e.obstructs_within_bounds) continue

    const cx = Number(e.center?.x)
    const cy = Number(e.center?.y)
    const w = Number(e.width)
    const h = Number(e.height)
    if (
      !Number.isFinite(cx) ||
      !Number.isFinite(cy) ||
      !Number.isFinite(w) ||
      !Number.isFinite(h)
    )
      continue
    if (w <= 0 || h <= 0) continue

    const isBottom = e.layer === "bottom"
    const vertSign = isBottom ? -1 : 1
    const boxCenterY =
      vertSign * (boardThickness / 2 + COMPONENT_THICKNESS_MM / 2)
    const rotDeg = Number(e.rotation ?? 0)

    boxes.push({
      center: { x: cx, y: boxCenterY, z: cy },
      size: { x: w, y: COMPONENT_THICKNESS_MM, z: h },
      rotation:
        Number.isFinite(rotDeg) && rotDeg !== 0
          ? { x: 0, y: (-rotDeg * Math.PI) / 180, z: 0 }
          : undefined,
      label:
        sourceNames.get(e.source_component_id) ??
        e.pcb_component_id ??
        "Component",
    })
  }
  return boxes
}
