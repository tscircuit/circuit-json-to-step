import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { jscadToStep } from "jscad-to-step"
import { circuitJsonToStep } from "../../../lib"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./bottom-mounted-step-component.json"

// Fixture generated with @tscircuit/core@0.0.2165 (schematic disabled) from:
// <board width={24} height={16} thickness={1.6} routingDisabled>
//   <chip name="U1" footprint="soic8" layer="bottom"
//     cadModel={{ stepUrl: "./body.step" }} />
// </board>

test("repro: bottom-mounted STEP component appears above the PCB", async () => {
  const body = jscadToStep({
    type: "colorize",
    color: [1, 0.4, 0],
    shape: {
      type: "translate",
      vector: [0, 0, 1.5],
      shape: { type: "cuboid", size: [8, 6, 3] },
    },
  })
  const step = await circuitJsonToStep(circuitJson as CircuitJson, {
    fsMap: { "./body.step": body },
  })
  const imported = await importStepWithOcct(step)
  expect(imported.success).toBe(true)
  expect(imported.meshes.map((mesh) => mesh.name)).toEqual(["PCB", "U1"])

  // U1 should sit below the PCB (Z = -3.8 to -0.8 mm).
  // The current export puts it at Z = -0.8 to +2.2 mm, protruding above it.
  await expect(step).toMatchStepSnapshot(
    import.meta.path,
    "bottom-mounted-step-component",
  )
})
