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
    repeated.push(
      {
        type: "source_component",
        source_component_id: "logo",
        name: "LOGO",
        ftype: "simple_chip",
      },
      {
        type: "pcb_component",
        pcb_component_id: "logo_pcb",
        source_component_id: "logo",
        center: { x: 0, y: 10 },
        width: 1,
        height: 1,
        layer: "top",
        rotation: 0,
        obstructs_within_bounds: false,
      },
    )
    const exported = await circuitJsonToStep(repeated, {
      exportMode: "assembly",
    })
    expect(exported.match(/NEXT_ASSEMBLY_USAGE_OCCURRENCE/g)).toHaveLength(2)
    expect(exported.match(/= MANIFOLD_SOLID_BREP\(/g)).toHaveLength(1)
    expect(requests).toBe(1)
    await expect(exported).toMatchStepSnapshot(
      import.meta.path,
      "repeated-step-models",
    )
  } finally {
    globalThis.fetch = originalFetch
  }
}, 30_000)
