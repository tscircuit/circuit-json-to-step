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
  let fallbackCircuitJson = circuitJson

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
    fallbackCircuitJson = filteredCircuitJson as CircuitJson

    const { convertCircuitJsonTo3D } = await getCircuitJsonToGltfModule()

    const scene3d = await convertCircuitJsonTo3D(filteredCircuitJson, {
      boardThickness,
      renderBoardTextures: false,
    })

    const boxes = scene3d.boxes?.length
      ? (scene3d.boxes as SceneBox[])
      : createFallbackComponentBoxes(filteredCircuitJson, boardThickness)

    for (const box of boxes) {
      solids.push(createSceneBoxSolid(repo, box))
    }
  } catch (error) {
    console.warn("Failed to generate component mesh:", error)
    for (const box of createFallbackComponentBoxes(
      fallbackCircuitJson,
      boardThickness,
    )) {
      solids.push(createSceneBoxSolid(repo, box))
    }
  }

  return solids
}

export function createFallbackComponentBoxes(
  circuitJson: CircuitJson,
  boardThickness: number,
): SceneBox[] {
  const sourceNames = new Map<string, string>()
  for (const element of circuitJson as any[]) {
    if (
      element.type === "source_component" &&
      element.source_component_id &&
      element.name
    ) {
      sourceNames.set(element.source_component_id, element.name)
    }
  }

  const componentThickness = 0.6

  return (circuitJson as any[])
    .filter((element) => element.type === "pcb_component")
    .map((component): SceneBox | null => {
      const center = component.center
      const centerX = Number(center?.x)
      const centerY = Number(center?.y)
      const width = Number(component.width)
      const height = Number(component.height)
      if (
        !Number.isFinite(centerX) ||
        !Number.isFinite(centerY) ||
        !Number.isFinite(width) ||
        !Number.isFinite(height)
      ) {
        return null
      }

      const layer = component.layer === "bottom" ? "bottom" : "top"
      const verticalSign = layer === "bottom" ? -1 : 1
      const rotationDegrees = Number(component.rotation ?? 0)

      return {
        center: {
          x: centerX,
          y: verticalSign * (boardThickness / 2 + componentThickness / 2),
          z: centerY,
        },
        size: {
          x: width,
          y: componentThickness,
          z: height,
        },
        rotation: Number.isFinite(rotationDegrees)
          ? { x: 0, y: (-rotationDegrees * Math.PI) / 180, z: 0 }
          : undefined,
        label:
          sourceNames.get(component.source_component_id) ??
          component.pcb_component_id ??
          "Component",
      }
    })
    .filter((box): box is SceneBox => box !== null)
}
