import { expect, test } from "bun:test"
import { getCircuitJsonToGltfModule } from "../lib/index"

test("getCircuitJsonToGltfModule returns the circuit-json-to-gltf module", async () => {
  const loaded = await getCircuitJsonToGltfModule()
  const direct = await import("circuit-json-to-gltf")

  expect(loaded).toBe(direct)
  expect(loaded.convertCircuitJsonTo3D).toBeFunction()
  expect(loaded.convertSceneToGLTF).toBeFunction()
})
