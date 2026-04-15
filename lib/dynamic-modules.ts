import type { CircuitJson } from "circuit-json"
import type { SceneBox } from "./scene-geometry"

export const CIRCUIT_JSON_TO_GLTF_MODULE = "circuit-json-to-gltf" as const

export interface DynamicModuleWithRepo<TModule> {
  repo(): TModule
}

export interface CircuitJsonToGltf3DOptions {
  boardThickness?: number
  renderBoardTextures?: boolean
  showBoundingBoxes?: boolean
}

export interface CircuitJsonToGltfScene {
  boxes: SceneBox[]
  camera?: {
    position: { x: number; y: number; z: number }
    target: { x: number; y: number; z: number }
    fov?: number
  }
}

export interface CircuitJsonToGltfModule {
  convertCircuitJsonTo3D(
    circuitJson: CircuitJson,
    options?: CircuitJsonToGltf3DOptions,
  ): Promise<CircuitJsonToGltfScene>
  convertSceneToGLTF(
    scene: CircuitJsonToGltfScene,
    options?: { binary?: boolean },
  ): Promise<ArrayBuffer | object>
}

type DynamicModuleRegistry = {
  [CIRCUIT_JSON_TO_GLTF_MODULE]?: DynamicModuleWithRepo<CircuitJsonToGltfModule>
} & Record<string, unknown>

declare global {
  var tscircuitDynamicModules: DynamicModuleRegistry | undefined
}

export class DynamicModuleRegistryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DynamicModuleRegistryError"
  }
}

function getDynamicModuleRegistry(): DynamicModuleRegistry {
  return (
    globalThis.tscircuitDynamicModules ??
    (globalThis.tscircuitDynamicModules = {})
  )
}

function assertDynamicModuleWithRepo<TModule>(
  name: string,
  mod: unknown,
): asserts mod is DynamicModuleWithRepo<TModule> {
  if (
    typeof mod !== "object" ||
    mod === null ||
    !("repo" in mod) ||
    typeof mod.repo !== "function"
  ) {
    throw new DynamicModuleRegistryError(
      `Invalid dynamic module: "${name}". Expected globalThis.tscircuitDynamicModules["${name}"] to expose a repo() function.`,
    )
  }
}

export function getDynamicModule<TModule>(
  name: string,
): DynamicModuleWithRepo<TModule> {
  const registry = getDynamicModuleRegistry()
  const mod = registry[name]

  if (!mod) {
    throw new DynamicModuleRegistryError(
      `Missing dynamic module: "${name}". Ensure it is registered via the dynamic importer before use.`,
    )
  }

  assertDynamicModuleWithRepo<TModule>(name, mod)
  return mod
}

async function importCircuitJsonToGltfModule(): Promise<CircuitJsonToGltfModule> {
  try {
    const mod = await import(/* @vite-ignore */ CIRCUIT_JSON_TO_GLTF_MODULE)
    return mod as CircuitJsonToGltfModule
  } catch {
    throw new DynamicModuleRegistryError(
      `Missing module: "${CIRCUIT_JSON_TO_GLTF_MODULE}". Either register it in globalThis.tscircuitDynamicModules["${CIRCUIT_JSON_TO_GLTF_MODULE}"] with a repo() function, or install the "${CIRCUIT_JSON_TO_GLTF_MODULE}" package so it can be loaded directly.`,
    )
  }
}

function assertCircuitJsonToGltfModule(
  mod: unknown,
): asserts mod is CircuitJsonToGltfModule {
  const candidate = mod as {
    convertCircuitJsonTo3D?: unknown
    convertSceneToGLTF?: unknown
  } | null

  if (
    typeof candidate !== "object" ||
    candidate === null ||
    typeof candidate.convertCircuitJsonTo3D !== "function" ||
    typeof candidate.convertSceneToGLTF !== "function"
  ) {
    throw new DynamicModuleRegistryError(
      `Invalid dynamic module repo: "${CIRCUIT_JSON_TO_GLTF_MODULE}". Expected repo() to return an object with convertCircuitJsonTo3D() and convertSceneToGLTF().`,
    )
  }
}

export async function getCircuitJsonToGltfModule(): Promise<CircuitJsonToGltfModule> {
  const registry = getDynamicModuleRegistry()
  const registeredModule = registry[CIRCUIT_JSON_TO_GLTF_MODULE]

  if (registeredModule !== undefined) {
    assertDynamicModuleWithRepo<CircuitJsonToGltfModule>(
      CIRCUIT_JSON_TO_GLTF_MODULE,
      registeredModule,
    )
    const mod = registeredModule.repo()
    assertCircuitJsonToGltfModule(mod)
    return mod
  }

  const importedModule = await importCircuitJsonToGltfModule()
  assertCircuitJsonToGltfModule(importedModule)
  registry[CIRCUIT_JSON_TO_GLTF_MODULE] = {
    repo: () => importedModule,
  }

  const mod = registry[CIRCUIT_JSON_TO_GLTF_MODULE]?.repo()
  assertCircuitJsonToGltfModule(mod)
  return mod
}
