import type { CircuitJson } from "circuit-json"
import type { Ref, Repository } from "stepts"
import { ManifoldSolidBrep } from "stepts"
import { createSceneBoxSolid } from "./scene-box-to-step"
import {
  DynamicModuleRegistryError,
  getCircuitJsonToGltfModule,
} from "./dynamic-modules"
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
  } catch (error) {
    if (error instanceof DynamicModuleRegistryError) {
      throw error
    }
    console.warn("Failed to generate component mesh:", error)
  }

  return solids
}
