import { expect, test } from "bun:test"
import { assembly, RootCircuit } from "@tscircuit/core"
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

  const circuit = new RootCircuit()
  circuit.add(
    <assembly.device>
      <assembly.printedpart
        name="ORANGE_CASE"
        modelUrl="./blue-case.step"
        color="#ff6600"
      />
    </assembly.device>,
  )
  circuit.render()

  expect(circuit.db.cad_component.list()).toEqual([
    expect.objectContaining({
      model_step_url: "./blue-case.step",
      color: "#ff6600",
    }),
  ])

  const step = await circuitJsonToStep(circuit.getCircuitJson(), {
    fsMap: { "./blue-case.step": blueCase },
  })

  // The requested color is orange, but the exported case stays blue.
  // Capture the current bug so a fix can update this same snapshot.
  await expect(step).toMatchStepSnapshot(
    import.meta.path,
    "imported-step-color-override",
  )
})
