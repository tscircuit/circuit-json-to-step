import type { CircuitJson } from "circuit-json"
import type { SceneBox } from "./scene-geometry"

export const circuitJsonToGltfModuleName = "circuit-json-to-gltf" as const

export interface CircuitJsonToGltf3DOptions {
  boardThickness?: number
  renderBoardTextures?: boolean
  showBoundingBoxes?: boolean
}

export interface CircuitJsonToGltfScene {
  boxes: unknown[]
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
  [circuitJsonToGltfModuleName]?: CircuitJsonToGltfModule
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
      `Invalid module: "${circuitJsonToGltfModuleName}". Expected an object with convertCircuitJsonTo3D() and convertSceneToGLTF().`,
    )
  }
}

export async function getCircuitJsonToGltfModule(): Promise<CircuitJsonToGltfModule> {
  try {
    const importedModule = await import("circuit-json-to-gltf")
    assertCircuitJsonToGltfModule(importedModule)
    return importedModule
  } catch {
    const dynamicGlobal =
      globalThis.tscircuitDynamicModules?.[circuitJsonToGltfModuleName]

    if (dynamicGlobal) {
      assertCircuitJsonToGltfModule(dynamicGlobal)
      return dynamicGlobal
    }

    throw new DynamicModuleRegistryError(
      `Missing module: "${circuitJsonToGltfModuleName}". Install the package or register globalThis.tscircuitDynamicModules["${circuitJsonToGltfModuleName}"].`,
    )
  }
}
