import type { CircuitJson } from "circuit-json"
import type { Ref, Repository } from "stepts"
import { ManifoldSolidBrep } from "stepts"
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

    // Helper to generate a fallback box
    const createFallbackBox = (
      element: any,
      height: number,
      zOffset: number,
    ) => {
      if (
        typeof element.center?.x !== "number" ||
        typeof element.center?.y !== "number" ||
        typeof element.width !== "number" ||
        typeof element.height !== "number"
      ) {
        // For smtpad it's x,y instead of center.x, center.y
        if (
          typeof element.x === "number" &&
          typeof element.y === "number" &&
          typeof element.width === "number" &&
          typeof element.height === "number"
        ) {
          return {
            center: {
              x: element.x,
              y: element.y,
              z: element.layer === "bottom" ? -zOffset : zOffset,
            },
            size: { x: element.width, y: element.height, z: height },
            rotation: { x: 0, y: 0, z: element.rotation || 0 },
            label:
              element.pcb_component_id ||
              element.pcb_smtpad_id ||
              element.pcb_silkscreen_rect_id ||
              "fallback",
          }
        }
        return null
      }

      return {
        center: {
          x: element.center.x,
          y: element.center.y,
          z: element.layer === "bottom" ? -zOffset : zOffset,
        },
        size: { x: element.width, y: element.height, z: height },
        rotation: { x: 0, y: 0, z: element.rotation || 0 },
        label:
          element.pcb_component_id ||
          element.pcb_smtpad_id ||
          element.pcb_silkscreen_rect_id ||
          "fallback",
      }
    }

    // Provide fallbacks for components/rectangles if the mesh generation didn't provide enough boxes
    // For pcb_component: height 1mm, zOffset on top of board
    for (const element of filteredCircuitJson) {
      let fallbackBox = null
      if (element.type === "pcb_component") {
        fallbackBox = createFallbackBox(element, 1.0, boardThickness / 2 + 0.5)
      } else if (element.type === "pcb_smtpad" && element.shape === "rect") {
        fallbackBox = createFallbackBox(
          element,
          0.05,
          boardThickness / 2 + 0.025,
        )
      } else if (element.type === "pcb_silkscreen_rect") {
        fallbackBox = createFallbackBox(
          element,
          0.05,
          boardThickness / 2 + 0.025,
        )
      }

      if (fallbackBox) {
        // Only add if there isn't already a box near this center
        const hasExistingBox = (scene3d.boxes as SceneBox[]).some((b) => {
          const dx = b.center.x - fallbackBox!.center.x
          const dy = b.center.y - fallbackBox!.center.y
          return Math.sqrt(dx * dx + dy * dy) < 0.1
        })

        if (!hasExistingBox) {
          solids.push(createSceneBoxSolid(repo, fallbackBox))
        }
      }
    }
  } catch (error) {
    console.warn("Failed to generate component mesh:", error)
  }

  return solids
}
