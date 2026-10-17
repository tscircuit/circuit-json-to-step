import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { jscadToStep } from "jscad-to-step"
import { circuitJsonToStep } from "../../../lib"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./imported-step-color-override.json"

// Fixture generated with @tscircuit/core@0.0.2165 from:
// <assembly.device>
//   <assembly.printedpart name="ORANGE_CASE" modelUrl="./blue-case.step" color="#ff6600" />
// </assembly.device>

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

  const step = await circuitJsonToStep(circuitJson as CircuitJson, {
    fsMap: { "./blue-case.step": blueCase },
  })
  const imported = await importStepWithOcct(step)
  expect(imported.success).toBe(true)
  expect(imported.meshes.map((mesh) => mesh.name)).toEqual(["ORANGE_CASE"])

  // The requested color is orange, but the exported case stays blue.
  // Capture the current bug so a fix can update this same snapshot.
  await expect(step).toMatchStepSnapshot(
    import.meta.path,
    "imported-step-color-override",
  )
})
