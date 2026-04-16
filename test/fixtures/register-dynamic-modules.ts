const gltfModuleName = "circuit-json-to-gltf"
const circuitJsonToGltf = await import("circuit-json-to-gltf")

globalThis.tscircuitDynamicModules ??= {}
globalThis.tscircuitDynamicModules[gltfModuleName] = circuitJsonToGltf
