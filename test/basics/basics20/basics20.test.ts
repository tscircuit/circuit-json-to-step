import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { jscadToStep } from "jscad-to-step"
import { circuitJsonToStep } from "../../../lib/index"
import nestedFixture from "../basics07/basics07.json"
import circuitJson from "./basics20.json"

test("basics20: nested imported STEP assemblies fail explicitly and repeated models fetch once", async () => {
  const nested = await circuitJsonToStep(nestedFixture as CircuitJson, {
    exportMode: "assembly",
  })
  await expect(
    circuitJsonToStep(circuitJson as CircuitJson, {
      exportMode: "assembly",
      fsMap: { "https://models.example/nested.step": nested },
    }),
  ).rejects.toThrow('Part "IMPORTED_ASSEMBLY" uses a nested STEP assembly')
  const originalFetch = globalThis.fetch
  const geometry = jscadToStep({ type: "cuboid", size: [2, 2, 2] })
  let requests = 0
  try {
    globalThis.fetch = Object.assign(
      async () => {
        requests++
        return new Response(geometry)
      },
      { preconnect: originalFetch.preconnect },
    )
    const repeated = structuredClone(circuitJson) as CircuitJson
    const model = repeated[1]
    if (model.type !== "cad_component") throw new Error("Missing CAD fixture")
    repeated.push({
      ...model,
      cad_component_id: "copy",
      position: { x: 10, y: 0, z: 0 },
    })
    const exported = await circuitJsonToStep(repeated, {
      exportMode: "assembly",
    })
    expect(exported.match(/NEXT_ASSEMBLY_USAGE_OCCURRENCE/g)).toHaveLength(2)
    expect(requests).toBe(1)
  } finally {
    globalThis.fetch = originalFetch
  }
}, 30_000)
