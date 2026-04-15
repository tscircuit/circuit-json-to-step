const gltfModuleName = "circuit-json-to-gltf"
const circuitJsonToGltf = await import(/* @vite-ignore */ gltfModuleName)

globalThis.tscircuitDynamicModules ??= {}
globalThis.tscircuitDynamicModules[gltfModuleName] = {
  repo: () => circuitJsonToGltf,
}
