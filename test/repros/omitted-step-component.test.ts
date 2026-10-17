import { expect, spyOn, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { parseRepository } from "stepts"
import { circuitJsonToStep } from "../../lib/index"
import { importStepWithOcct } from "../utils/occt/importer"
import { renderStepToPNG } from "../fixtures/step-snapshot"
import { Resvg } from "@resvg/resvg-js"
import { fileURLToPath } from "node:url"

test("STEP export succeeds after discarding a valid component model", async () => {
  const componentStep = await circuitJsonToStep([], {
    exportMode: "pcb",
    boardWidth: 4,
    boardHeight: 4,
    boardThickness: 2,
    productName: "U1",
  })
  // Legal STEP whitespace, matching the supplier models rejected by stepts.
  const spacedComponentStep = componentStep.replace(
    "DIRECTION('',(1.,0.,0.));",
    "DIRECTION ( 'NONE', ( 1., 0., 0. ) ) ;",
  )
  expect(spacedComponentStep).not.toBe(componentStep)
  const component = await importStepWithOcct(spacedComponentStep)
  expect(component.success).toBe(true)
  expect(component.meshes).toHaveLength(1)
  expect(() => parseRepository(spacedComponentStep)).toThrow()

  const circuitJson: CircuitJson = [
    {
      type: "source_component",
      source_component_id: "source_u1",
      name: "U1",
      ftype: "simple_chip",
      supplier_part_numbers: {},
    },
    {
      type: "cad_component",
      cad_component_id: "cad_u1",
      source_component_id: "source_u1",
      position: { x: 0, y: 0, z: 2 },
      size: { x: 4, y: 4, z: 2 },
      model_step_url: "component.step",
      anchor_alignment: "center",
      model_object_fit: "contain_within_bounds",
    },
  ]
  const options = {
    exportMode: "pcb" as const,
    boardWidth: 14,
    boardHeight: 10,
    boardThickness: 1.6,
    includeComponents: true,
    includeExternalMeshes: true,
  }
  const completeStep = await circuitJsonToStep(circuitJson, {
    ...options,
    fsMap: { "component.step": componentStep },
  })
  expect((await importStepWithOcct(completeStep)).meshes).toHaveLength(2)

  const warning = spyOn(console, "warn").mockImplementation(() => {})
  let incompleteStep: string | undefined
  let exportError: unknown
  let warningCount = 0
  try {
    incompleteStep = await circuitJsonToStep(circuitJson, {
      ...options,
      fsMap: { "component.step": spacedComponentStep },
    })
  } catch (error) {
    exportError = error
  } finally {
    warningCount = warning.mock.calls.length
    warning.mockRestore()
  }
  expect(exportError).toBeUndefined()
  expect(warningCount).toBe(1)
  if (!incompleteStep) throw new Error("Expected a successful STEP export")
  const assembly = await importStepWithOcct(incompleteStep)
  expect(assembly.success).toBe(true)
  expect(assembly.meshes).toHaveLength(1)
  let preview = ""
  let status = "Export rejected; no incomplete STEP file returned"
  if (incompleteStep) {
    const png = await renderStepToPNG(incompleteStep, {
      width: 800,
      height: 450,
    })
    preview = `<image x="0" y="130" width="800" height="450" href="data:image/png;base64,${Buffer.from(png).toString("base64")}"/>`
    status = `Export succeeded: ${assembly.meshes.length} mesh instead of 2 (U1 missing)`
  }
  const snapshot = new Resvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
    <rect width="800" height="600" fill="#101820"/>
    <g font-family="KenPixel" fill="white" text-anchor="middle">
      <text x="400" y="35" font-size="23">One board + one valid U1 STEP model</text>
      <text x="400" y="70" font-size="16">OpenCascade accepts the model; stepts rejects legal whitespace.</text>
      <text x="400" y="108" font-size="18" fill="#ffba70">${status}</text>
    </g>${preview}
  </svg>`,
    {
      font: {
        fontFiles: [
          fileURLToPath(new URL("../fixtures/kenpixel.ttf", import.meta.url)),
        ],
        loadSystemFonts: false,
        defaultFontFamily: "KenPixel",
      },
    },
  )
    .render()
    .asPng()
  await expect(snapshot).toMatchPngSnapshot(import.meta.path)
}, 20_000)
