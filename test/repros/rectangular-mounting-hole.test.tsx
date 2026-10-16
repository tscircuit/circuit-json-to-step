import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../lib"

test("repro: rectangular mounting hole disappears from STEP export", async () => {
  const circuitJson: CircuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb",
      width: 20,
      height: 12,
      thickness: 1.6,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_hole",
      pcb_hole_id: "mount",
      hole_shape: "rect",
      x: 0,
      y: 0,
      hole_width: 8,
      hole_height: 4,
    },
  ]

  const step = await circuitJsonToStep(circuitJson)

  // An 8 x 4 mm opening should be visible in the center of the board.
  // Capture the current solid-board output so a fix can update this snapshot.
  await expect(step).toMatchStepSnapshot(
    import.meta.path,
    "rectangular-mounting-hole",
  )
})
