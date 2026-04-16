import { expect, test } from "bun:test"
import {
  CIRCUIT_JSON_TO_GLTF_MODULE,
  getCircuitJsonToGltfModule,
} from "../lib/dynamic-modules"

test("dynamic modules: prefers package import over registered global module", async () => {
  const originalRegistry = globalThis.tscircuitDynamicModules
  const stubModule = {
    convertCircuitJsonTo3D: async () => ({ boxes: [] }),
    convertSceneToGLTF: async () => new ArrayBuffer(0),
  }

  try {
    globalThis.tscircuitDynamicModules = {
      [CIRCUIT_JSON_TO_GLTF_MODULE]: stubModule,
    }

    const mod = await getCircuitJsonToGltfModule()
    expect(mod).not.toBe(stubModule)
    expect(typeof mod.convertCircuitJsonTo3D).toBe("function")
    expect(typeof mod.convertSceneToGLTF).toBe("function")
  } finally {
    globalThis.tscircuitDynamicModules = originalRegistry
  }
})

test("dynamic modules: imports package when registry is empty", async () => {
  const originalRegistry = globalThis.tscircuitDynamicModules

  try {
    globalThis.tscircuitDynamicModules = undefined

    const mod = await getCircuitJsonToGltfModule()
    expect(typeof mod.convertCircuitJsonTo3D).toBe("function")
    expect(typeof mod.convertSceneToGLTF).toBe("function")
  } finally {
    globalThis.tscircuitDynamicModules = originalRegistry
  }
})

test("dynamic modules: ignores invalid registered module when package import succeeds", async () => {
  const originalRegistry = globalThis.tscircuitDynamicModules

  try {
    globalThis.tscircuitDynamicModules = {
      [CIRCUIT_JSON_TO_GLTF_MODULE]: {} as any,
    }

    const mod = await getCircuitJsonToGltfModule()
    expect(typeof mod.convertCircuitJsonTo3D).toBe("function")
    expect(typeof mod.convertSceneToGLTF).toBe("function")
  } finally {
    globalThis.tscircuitDynamicModules = originalRegistry
  }
})
