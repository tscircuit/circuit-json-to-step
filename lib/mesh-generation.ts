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
      renderBoardTextures: true,
    })

    for (const box of scene3d.boxes as SceneBox[]) {
      solids.push(createSceneBoxSolid(repo, box))
    }

    // Manually add pads as thin boxes if they are not returned by convertCircuitJsonTo3D
    const pads = filteredCircuitJson.filter((e) => e.type === "pcb_smtpad")
    for (const pad of pads as any[]) {
      if (pad.shape === "rect") {
        const thickness = 0.02
        const zPos =
          pad.layer === "top"
            ? boardThickness / 2 + thickness / 2
            : -boardThickness / 2 - thickness / 2

        solids.push(
          createSceneBoxSolid(repo, {
            center: { x: pad.x, y: pad.y, z: zPos },
            size: { x: pad.width, y: pad.height, z: thickness },
            label: `Pad ${pad.pcb_smtpad_id}`,
          }),
        )
      }
    }

    // Manually add silkscreen rectangles
    const silkscreenRects = filteredCircuitJson.filter(
      (e) => e.type === "pcb_silkscreen_rect",
    )
    for (const rect of silkscreenRects as any[]) {
      const thickness = 0.02
      const zPos =
        rect.layer === "top"
          ? boardThickness / 2 + thickness / 2
          : -boardThickness / 2 - thickness / 2

      solids.push(
        createSceneBoxSolid(repo, {
          center: { x: rect.center.x, y: rect.center.y, z: zPos },
          size: { x: rect.width, y: rect.height, z: thickness },
          label: `Silkscreen Rect`,
        }),
      )
    }
  } catch (error) {
    console.warn("Failed to generate component mesh:", error)
  }

  return solids
}
