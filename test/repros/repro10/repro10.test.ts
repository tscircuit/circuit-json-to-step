import { expect, spyOn, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { Resvg } from "@resvg/resvg-js"
import { jscadToStep } from "jscad-to-step"
import { circuitJsonToStep } from "../../../lib/index"
import { renderStepToPNG } from "../../fixtures/step-snapshot"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuit from "../repro09/repro09.json"

test("repro10: visualize valid control and unreadable STEP export outcome", async () => {
  const valid = jscadToStep({ type: "cuboid", size: [4, 3, 4] })
  const options = {
    exportMode: "pcb" as const,
    includeComponents: true,
    includeExternalMeshes: true,
  }
  const control = await circuitJsonToStep(circuit as CircuitJson, {
    ...options,
    fsMap: { "U1.step": valid, "R1.step": valid },
  })
  const controlMeshes = await importStepWithOcct(control)
  expect(controlMeshes.success).toBe(true)
  expect(controlMeshes.meshes).toHaveLength(3)
  let output: string | undefined
  let failure: unknown
  const warning = spyOn(console, "warn").mockImplementation(() => {})
  try {
    output = await circuitJsonToStep(circuit as CircuitJson, {
      ...options,
      fsMap: { "U1.step": "invalid STEP", "R1.step": valid },
    })
  } catch (error) {
    failure = error
  } finally {
    warning.mockRestore()
  }
  const camera = {
    width: 600,
    height: 450,
    camPos: [38, -45, 40] as const,
    lookAt: [0, 0, 0] as const,
  }
  const controlPng = await renderStepToPNG(control, camera)
  let right = ""
  let status = "Rejected: no incomplete STEP returned"
  if (output !== undefined) {
    const actual = await importStepWithOcct(output)
    expect(actual.success).toBe(true)
    expect(actual.meshes).toHaveLength(2)
    const png = await renderStepToPNG(output, camera)
    right = `<image x="600" y="100" width="600" height="450" href="data:image/png;base64,${Buffer.from(png).toString("base64")}"/>`
    status = "Succeeded: PCB + R1 only; U1 missing"
  } else {
    expect(failure).toBeInstanceOf(Error)
    right =
      '<text x="900" y="310" text-anchor="middle" fill="#fbbf24" font-size="24">No STEP file produced</text>'
  }
  const png =
    new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600">
    <rect width="1200" height="600" fill="#101820"/>
    <g fill="white" font-family="sans-serif" font-size="22" text-anchor="middle">
      <text x="300" y="40">Valid control: PCB + U1 + R1</text>
      <text x="900" y="40">Same board, unreadable U1 STEP</text>
      <text x="900" y="80" font-size="18">${status}</text>
      <text x="600" y="580" font-size="18">Geometry rendered from exported STEP using OpenCascade; no substitute component geometry</text>
    </g>
    <image x="0" y="100" width="600" height="450" href="data:image/png;base64,${Buffer.from(controlPng).toString("base64")}"/>
    ${right}
  </svg>`)
      .render()
      .asPng()
  await expect(png).toMatchPngSnapshot(import.meta.path, "unreadable-step")
}, 30_000)
