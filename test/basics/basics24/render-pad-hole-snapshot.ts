import { Resvg } from "@resvg/resvg-js"
import type { CircuitJson } from "circuit-json"
import { fileURLToPath } from "node:url"
import { circuitJsonToStep } from "../../../lib"
import { renderStepToPNG } from "../../fixtures/step-snapshot"
import { createPadReferences } from "./create-pad-references"
import fixture from "./basics24.json"

export async function renderPadHoleSnapshot({
  stepText,
  stage,
}: {
  stepText: string
  stage: "before" | "after"
}) {
  const displayModel: CircuitJson = [
    {
      type: "source_component",
      source_component_id: "substrate",
      ftype: "printedpart",
      name: "STEP substrate",
    },
    {
      type: "cad_component",
      cad_component_id: "substrate_cad",
      source_component_id: "substrate",
      position: { x: 0, y: 0, z: 0 },
      model_step_url: "substrate.step",
      anchor_alignment: "center",
      model_object_fit: "contain_within_bounds",
    },
    ...createPadReferences(fixture as CircuitJson),
  ]
  const displayStep = await circuitJsonToStep(displayModel, {
    exportMode: "assembly",
    fsMap: { "substrate.step": stepText },
  })
  const png = await renderStepToPNG(displayStep, {
    width: 800,
    height: 480,
    ambient: 0.8,
    camPos: [0, 0, 180],
    lookAt: [0, 0, 0],
    fov: 3,
  })
  const title =
    stage === "before"
      ? "Before: round-pill STEP export fails"
      : "After: round-pill STEP export succeeds"
  const detail =
    stage === "before"
      ? "STEP real must be finite. Substrate below: working controls only."
      : "Actual STEP substrate: round drill (left), slot (middle), circle (right)."
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="592">
    <rect width="800" height="592" fill="#151515" />
    <rect width="800" height="112" fill="white" />
    <text x="16" y="30" font-size="22" fill="black">${title}</text>
    <text x="16" y="59" font-size="16" fill="black">${detail}</text>
    <text x="16" y="88" font-size="14" fill="black">Copper pads are reference geometry from the same input.</text>
    <image x="0" y="112" width="800" height="480" href="data:image/png;base64,${Buffer.from(png).toString("base64")}" />
  </svg>`
  return new Resvg(svg, {
    font: {
      loadSystemFonts: false,
      fontFiles: [
        fileURLToPath(
          new URL(
            "./TscircuitAlphabet.ttf",
            import.meta.resolve("@tscircuit/alphabet"),
          ),
        ),
      ],
      defaultFontFamily: "TscircuitAlphabet",
      sansSerifFamily: "TscircuitAlphabet",
    },
  })
    .render()
    .asPng()
}
