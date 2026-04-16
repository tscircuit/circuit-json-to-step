export type CircuitJsonToGltfModule = typeof import("circuit-json-to-gltf")

declare global {
  var tscircuitDynamicModules:
    | {
        "circuit-json-to-gltf"?: CircuitJsonToGltfModule
      }
    | undefined
}

export const getCircuitJsonToGltfModule =
  async (): Promise<CircuitJsonToGltfModule> => {
    try {
      return await import("circuit-json-to-gltf")
    } catch (error) {
      const dynamicGlobal =
        globalThis.tscircuitDynamicModules?.["circuit-json-to-gltf"]
      if (dynamicGlobal) return dynamicGlobal
      throw new Error(
        'Unable to load "circuit-json-to-gltf" from import() or globalThis.tscircuitDynamicModules.',
        { cause: error },
      )
    }
  }
