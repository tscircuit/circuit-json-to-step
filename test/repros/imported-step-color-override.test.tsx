import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { jscadToStep } from "jscad-to-step"
import { circuitJsonToStep } from "../../lib"

test("repro: imported STEP model ignores the orange CAD color override", async () => {
  const blueCase = jscadToStep({
    type: "colorize",
    color: [0, 0, 1],
    shape: {
      type: "subtract",
      shapes: [
        { type: "cuboid", size: [10, 8, 4] },
        {
          type: "translate",
          vector: [0, 0, 1],
          shape: { type: "cuboid", size: [8, 6, 4] },
        },
      ],
    },
  })

  const circuitJson: CircuitJson = [
    {
      type: "source_component",
      source_component_id: "case",
      name: "ORANGE_CASE",
      ftype: "printedpart",
    },
    {
      type: "cad_component",
      cad_component_id: "cad_case",
      source_component_id: "case",
      anchor_alignment: "center",
      model_object_fit: "contain_within_bounds",
      position: { x: 0, y: 0, z: 0 },
      model_step_url: "./blue-case.step",
      color: "#ff6600",
    },
  ]

  const step = await circuitJsonToStep(circuitJson, {
    fsMap: { "./blue-case.step": blueCase },
  })

  // The requested color is orange, but the exported case stays blue.
  // Capture the current bug so a fix can update this same snapshot.
  await expect(step).toMatchStepSnapshot(
    import.meta.path,
    "imported-step-color-override",
  )
})
