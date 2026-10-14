import type { CircuitJson } from "circuit-json"
import type { Entity, Ref, Repository } from "stepts"

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
  solids: Ref<Entity>[]
  handledComponentIds: Set<string>
  handledPcbComponentIds: Set<string>
}

export interface MergeStepModelOptions {
  repo: Repository
  circuitJson: CircuitJson
  boardThickness: number
  /**
   * Pre-loaded STEP file contents, keyed by file path.
   * If a path is found here, the content is used directly instead of reading from disk.
   * Useful for browser environments where fs is not available.
   */
  fsMap?: Record<string, string>
}
