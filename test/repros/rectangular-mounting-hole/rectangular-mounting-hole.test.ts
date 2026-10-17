import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./rectangular-mounting-hole.json"

// Fixture generated with @tscircuit/core@0.0.2165 from:
// <board width={20} height={12} thickness={1.6}>
//   <hole shape="rect" width={8} height={4} pcbX={0} pcbY={0} />
// </board>

test("repro: rectangular mounting hole disappears from STEP export", async () => {
  const step = await circuitJsonToStep(circuitJson as CircuitJson)
  const imported = await importStepWithOcct(step)
  expect(imported.success).toBe(true)
  expect(imported.meshes.map((mesh) => mesh.name)).toEqual(["PCB"])

  // An 8 x 4 mm opening should be visible in the center of the board.
  // Capture the current solid-board output so a fix can update this snapshot.
  await expect(step).toMatchStepSnapshot(
    import.meta.path,
    "rectangular-mounting-hole",
  )
})
