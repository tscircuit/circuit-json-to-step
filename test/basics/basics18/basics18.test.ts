import { expect, spyOn, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics18.json"

test("basics18: imported printed-part meshes export with placement and missing meshes fail", async () => {
  const originalFetch = globalThis.fetch
  const model = await Bun.file(new URL("cube.obj", import.meta.url)).text()
  const errorLog = spyOn(console, "error").mockImplementation(() => {})
  try {
    globalThis.fetch = Object.assign(async () => new Response(model), {
      preconnect: originalFetch.preconnect,
    })
    const step = await circuitJsonToStep(circuitJson as CircuitJson)
    const imported = await importStepWithOcct(step)
    expect(imported.root.children[0].children[0].name).toBe("IMPORTED_MESH")
    expect(imported.meshes).toHaveLength(1)
    for (const [axis, min, max] of [
      [0, 2, 6],
      [1, 3, 7],
      [2, 4, 8],
    ]) {
      const values = imported.meshes[0].attributes.position.array.filter(
        (_, index) => index % 3 === axis,
      )
      expect(Math.min(...values)).toBeCloseTo(min)
      expect(Math.max(...values)).toBeCloseTo(max)
    }
    const missing = structuredClone(circuitJson) as CircuitJson
    const cad = missing.find((item) => item.type === "cad_component")!
    if (cad.type !== "cad_component") throw new Error("Missing CAD fixture")
    cad.model_obj_url = undefined
    cad.model_glb_url = "https://models.example/missing.glb"
    globalThis.fetch = Object.assign(
      async () => new Response("", { status: 404 }),
      { preconnect: originalFetch.preconnect },
    )
    await expect(circuitJsonToStep(missing)).rejects.toThrow(
      "External model mesh could not be loaded",
    )
  } finally {
    globalThis.fetch = originalFetch
    errorLog.mockRestore()
  }
}, 30_000)
