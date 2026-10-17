import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../lib"

const modelUrl = "https://assets.example.test/resistor.step"
const board = {
  type: "pcb_board",
  pcb_board_id: "board1",
  center: { x: 0, y: 0 },
  width: 10,
  height: 10,
  thickness: 1.6,
  num_layers: 2,
}
const circuitWithStep = (url = modelUrl): CircuitJson =>
  [
    board,
    {
      type: "cad_component",
      cad_component_id: "cad1",
      pcb_component_id: "pcb1",
      model_step_url: url,
      position: { x: 1, y: 2, z: 1.6 },
      rotation: { x: 0, y: 0, z: 0 },
      size: { x: 2, y: 1, z: 1 },
    },
  ] as CircuitJson

const readResistor = () =>
  Bun.file(
    new URL("./fixtures/kicad-models/R_0603_1608Metric.step", import.meta.url),
  ).text()

const withFakeFetch = async (
  run: (requests: string[], warnings: unknown[][]) => Promise<void>,
  response?: string,
) => {
  const previousFetch = globalThis.fetch
  const previousWarn = console.warn
  const requests: string[] = []
  const warnings: unknown[][] = []
  globalThis.fetch = Object.assign(
    async (input: Parameters<typeof fetch>[0]) => {
      requests.push(String(input))
      if (response === undefined)
        throw new Error("External requests are disabled")
      return new Response(response)
    },
    { preconnect: () => {} },
  )
  console.warn = (...message: unknown[]) => {
    warnings.push(message)
  }
  try {
    await run(requests, warnings)
  } finally {
    globalThis.fetch = previousFetch
    console.warn = previousWarn
  }
}

test("cache-only STEP export merges real cached models keyed by URL or local path", async () => {
  const model = await readResistor()
  await withFakeFetch(async (requests, warnings) => {
    for (const url of [modelUrl, ".cache/models/resistor.step"]) {
      const step = await circuitJsonToStep(circuitWithStep(url), {
        exportMode: "pcb",
        includeComponents: true,
        includeExternalMeshes: true,
        allowExternalModelFetch: false,
        fsMap: { [url]: model },
      })
      expect(step).toContain("MAPPED_ITEM")
      expect(step.match(/MANIFOLD_SOLID_BREP/g)!.length).toBeGreaterThan(1)
    }
    expect(requests).toEqual([])
    expect(warnings).toEqual([])
  })
})

test("cache misses and non-STEP mesh URLs cannot trigger external fetches", async () => {
  await withFakeFetch(async (requests, warnings) => {
    const circuit = [
      ...circuitWithStep(),
      {
        type: "cad_component",
        cad_component_id: "cad2",
        pcb_component_id: "pcb2",
        model_obj_url: "https://assets.example.test/missing.obj",
        footprinter_string: "0402",
        position: { x: 0, y: 0, z: 1.6 },
        rotation: { x: 0, y: 0, z: 0 },
        size: { x: 1, y: 1, z: 1 },
      },
    ] as CircuitJson
    const step = await circuitJsonToStep(circuit, {
      exportMode: "pcb",
      includeComponents: true,
      includeExternalMeshes: true,
      allowExternalModelFetch: false,
      fsMap: {},
    })
    expect(step).toContain("ISO-10303-21")
    expect(step).not.toContain("MAPPED_ITEM")
    expect(step.match(/MANIFOLD_SOLID_BREP/g)!.length).toBeGreaterThan(1)
    expect(warnings.flat().map(String).join(" ")).toContain(
      "STEP model missing from fsMap",
    )
    expect(requests).toEqual([])
  })
})

test("default exports still fetch uncached STEP models through the existing transport", async () => {
  await withFakeFetch(
    async (requests) => {
      const step = await circuitJsonToStep(circuitWithStep(), {
        exportMode: "pcb",
        includeComponents: true,
        includeExternalMeshes: true,
      })
      expect(step).toContain("MAPPED_ITEM")
      expect(requests).toEqual([modelUrl])
    },
    await readResistor(),
  )
})
