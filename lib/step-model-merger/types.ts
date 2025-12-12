import type { CircuitJson } from "circuit-json"
import type { ManifoldSolidBrep, Ref, Repository } from "stepts"

export type CadComponent = {
  type: "cad_component"
  cad_component_id?: string
  pcb_component_id?: string
  model_step_url?: string
  position?: { x?: number; y?: number; z?: number }
  rotation?: { x?: number; y?: number; z?: number }
}

export type PcbComponent = {
  type: "pcb_component"
  pcb_component_id?: string
  layer?: string
}

export type Vector3 = {
  x: number
  y: number
  z: number
}

export type MergeTransform = {
  translation: Vector3
  rotation: Vector3
}

export type MergeStepModelResult = {
  solids: Ref<ManifoldSolidBrep>[]
  handledComponentIds: Set<string>
  handledPcbComponentIds: Set<string>
}

export interface MergeStepModelOptions {
  repo: Repository
  circuitJson: CircuitJson
  boardThickness: number
  /**
   * Pre-loaded STEP file contents, keyed by URL/path.
   * If a URL is found here, the content is used directly instead of fetching.
   * Useful for tests that need to load local files.
   */
  stepContents?: Record<string, string>
}
