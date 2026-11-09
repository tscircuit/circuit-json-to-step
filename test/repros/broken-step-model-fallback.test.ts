import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { Repository } from "stepts"
import { circuitJsonToStep } from "../../lib/index"
import { mergeExternalStepModels } from "../../lib/step-model-merger"
import { importStepWithOcct } from "../utils/occt/importer"

const BROKEN_STEP = [
  "ISO-10303-21;",
  "HEADER;",
  "ENDSEC;",
  "DATA;",
  "#1 = THIS_IS_NOT ( VALID STEP",
  "ENDSEC;",
  "END-ISO-10303-21;",
].join("\n")

function createBoardWithBrokenStepComponent(stepUrl?: string): CircuitJson {
  return [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 30,
      height: 20,
      thickness: 1.6,
      center: { x: 0, y: 0 },
    },
    {
      type: "source_component",
      source_component_id: "source_u1",
      ftype: "simple_chip",
      name: "U1",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_u1",
      source_component_id: "source_u1",
      width: 5,
      height: 4,
      center: { x: -6, y: 0 },
      layer: "top",
      rotation: 0,
    },
    {
      type: "cad_component",
      cad_component_id: "cad_u1",
      pcb_component_id: "pcb_u1",
      source_component_id: "source_u1",
      position: { x: -6, y: 0, z: 0.8 },
      model_origin_position: { x: 0, y: 0, z: 0 },
      footprinter_string: "soic8",
      ...(stepUrl ? { model_step_url: stepUrl } : {}),
    },
    {
      type: "source_component",
      source_component_id: "source_r1",
      ftype: "simple_resistor",
      name: "R1",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_r1",
      source_component_id: "source_r1",
      width: 1.6,
      height: 0.8,
      center: { x: 8, y: 0 },
      layer: "top",
      rotation: 0,
    },
    {
      type: "cad_component",
      cad_component_id: "cad_r1",
      pcb_component_id: "pcb_r1",
      source_component_id: "source_r1",
      position: { x: 8, y: 0, z: 0.8 },
      model_origin_position: { x: 0, y: 0, z: 0 },
      footprinter_string: "0603",
    },
  ] as CircuitJson
}

test("falls back to generated footprint body when cadModel STEP fails to parse or fetch", async () => {
  const controlCircuit = createBoardWithBrokenStepComponent()
  const brokenParseCircuit = createBoardWithBrokenStepComponent("./broken.step")

  const controlStep = await circuitJsonToStep(controlCircuit, {
    exportMode: "pcb",
    includeComponents: true,
    includeExternalMeshes: true,
  })
  const brokenParseStep = await circuitJsonToStep(brokenParseCircuit, {
    exportMode: "pcb",
    includeComponents: true,
    includeExternalMeshes: true,
    fsMap: { "./broken.step": BROKEN_STEP },
  })

  const getSolidNames = (stepText: string) =>
    Array.from(
      stepText.matchAll(/MANIFOLD_SOLID_BREP\('([^']*)'/g),
      (match) => match[1],
    )

  expect(getSolidNames(controlStep)).toEqual(["PCB", "U1", "R1"])
  expect(getSolidNames(brokenParseStep)).toEqual(["PCB", "U1", "R1"])

  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = Object.assign(
      async () => new Response("Bad Request", { status: 400 }),
      { preconnect: originalFetch.preconnect },
    )
    const brokenFetchCircuit = createBoardWithBrokenStepComponent(
      "https://models.example/missing.step",
    )
    const brokenFetchStep = await circuitJsonToStep(brokenFetchCircuit, {
      exportMode: "pcb",
      includeComponents: true,
      includeExternalMeshes: true,
    })
    expect(getSolidNames(brokenFetchStep)).toEqual(["PCB", "U1", "R1"])
  } finally {
    globalThis.fetch = originalFetch
  }

  const assemblyStep = await circuitJsonToStep(brokenParseCircuit, {
    exportMode: "assembly",
    fsMap: { "./broken.step": BROKEN_STEP },
  })
  const importedAssembly = await importStepWithOcct(assemblyStep)
  expect(
    importedAssembly.root.children[0].children.map((child) => child.name),
  ).toEqual(["PCB", "U1", "R1"])

  const mergeResult = await mergeExternalStepModels({
    repo: new Repository(),
    circuitJson: brokenParseCircuit,
    boardThickness: 1.6,
    fsMap: { "./broken.step": BROKEN_STEP },
  })
  expect(Array.from(mergeResult.handledComponentIds)).toEqual([])
  expect(Array.from(mergeResult.failedComponentIds)).toEqual(["cad_u1"])
  expect(Array.from(mergeResult.failedPcbComponentIds)).toEqual(["pcb_u1"])
  expect(mergeResult.failedStepModels).toEqual([
    expect.objectContaining({
      cadComponentId: "cad_u1",
      pcbComponentId: "pcb_u1",
      stepUrl: "./broken.step",
    }),
  ])
}, 30_000)
