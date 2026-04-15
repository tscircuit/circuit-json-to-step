import { expect, test } from "bun:test"
import {
  CIRCUIT_JSON_TO_GLTF_MODULE,
  DynamicModuleRegistryError,
  getCircuitJsonToGltfModule,
} from "../lib/dynamic-modules"

test("dynamic modules: prefers registered global module", async () => {
  const originalRegistry = globalThis.tscircuitDynamicModules
  const stubModule = {
    convertCircuitJsonTo3D: async () => ({ boxes: [] }),
    convertSceneToGLTF: async () => new ArrayBuffer(0),
  }

  try {
    globalThis.tscircuitDynamicModules = {
      [CIRCUIT_JSON_TO_GLTF_MODULE]: {
        repo: () => stubModule,
      },
    }

    const mod = await getCircuitJsonToGltfModule()
    expect(mod).toBe(stubModule)
  } finally {
    globalThis.tscircuitDynamicModules = originalRegistry
  }
})

test("dynamic modules: falls back to package import when registry is empty", async () => {
  const originalRegistry = globalThis.tscircuitDynamicModules

  try {
    globalThis.tscircuitDynamicModules = undefined

    const mod = await getCircuitJsonToGltfModule()
    expect(typeof mod.convertCircuitJsonTo3D).toBe("function")
    expect(typeof mod.convertSceneToGLTF).toBe("function")
    const registry = globalThis.tscircuitDynamicModules as
      | Record<string, { repo?: unknown }>
      | undefined
    const registeredModule = registry?.[CIRCUIT_JSON_TO_GLTF_MODULE]
    expect(typeof registeredModule?.repo).toBe("function")
  } finally {
    globalThis.tscircuitDynamicModules = originalRegistry
  }
})

test("dynamic modules: rejects invalid registered module shape", async () => {
  const originalRegistry = globalThis.tscircuitDynamicModules

  try {
    globalThis.tscircuitDynamicModules = {
      [CIRCUIT_JSON_TO_GLTF_MODULE]: {} as any,
    }

    await expect(getCircuitJsonToGltfModule()).rejects.toBeInstanceOf(
      DynamicModuleRegistryError,
    )
  } finally {
    globalThis.tscircuitDynamicModules = originalRegistry
  }
})
