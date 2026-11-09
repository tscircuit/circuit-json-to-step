import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { jscadToStep } from "jscad-to-step"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import fixture from "../repro09/repro09.json"

test("repro11: reject failed model reads and preserve valid exports and component opt-out", async () => {
  const circuit = structuredClone(fixture) as CircuitJson
  const model = circuit.find((item) => item.type === "cad_component")!
  if (model.type !== "cad_component") throw new Error("Missing CAD fixture")
  const url = "https://models.example/U1.step"
  model.model_step_url = url
  const valid = jscadToStep({ type: "cuboid", size: [4, 3, 4] })
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = Object.assign(
      async () =>
        new Response("missing model", { status: 404, statusText: "Not Found" }),
      { preconnect: originalFetch.preconnect },
    )
    await expect(
      circuitJsonToStep(circuit, {
        exportMode: "pcb",
        includeComponents: true,
        includeExternalMeshes: true,
        fsMap: { "R1.step": valid },
      }),
    ).rejects.toMatchObject({
      message: `Failed to import STEP model for component "U1" (${url})`,
      cause: expect.objectContaining({ message: "HTTP 404 Not Found" }),
    })
    // Default assembly mode already rejected unreadable models; preserve that contract.
    await expect(
      circuitJsonToStep(circuit, {
        fsMap: { [url]: "invalid STEP", "R1.step": valid },
      }),
    ).rejects.toThrow()
    const noSolid =
      "ISO-10303-21;\nHEADER;\nENDSEC;\nDATA;\n#1 = CARTESIAN_POINT('',(0.,0.,0.));\nENDSEC;\nEND-ISO-10303-21;"
    await expect(
      circuitJsonToStep(circuit, {
        fsMap: { [url]: noSolid, "R1.step": valid },
      }),
    ).rejects.toThrow("Failed to import STEP model")
    const unnamed = circuit.filter((item) => item.type !== "source_component")
    await expect(
      circuitJsonToStep(unnamed, {
        exportMode: "pcb",
        includeComponents: true,
        includeExternalMeshes: true,
        fsMap: { [url]: "", "R1.step": valid },
      }),
    ).rejects.toThrow('component "U1_cad"')
    // Board-only export does not request component models.
    const board = await circuitJsonToStep(circuit, { exportMode: "pcb" })
    expect((await importStepWithOcct(board)).meshes).toHaveLength(1)
    for (const exportMode of ["pcb", "assembly"] as const) {
      const step = await circuitJsonToStep(circuit, {
        exportMode,
        includeComponents: true,
        includeExternalMeshes: true,
        fsMap: { [url]: valid, "R1.step": valid },
      })
      const imported = await importStepWithOcct(step)
      expect(imported.success).toBe(true)
      expect(imported.meshes).toHaveLength(3)
    }
  } finally {
    globalThis.fetch = originalFetch
  }
}, 30_000)
