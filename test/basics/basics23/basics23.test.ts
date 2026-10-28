import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics23.json"

test("basics23: multi-board assemblies cut each pcb_cutout only from its own board", async () => {
  const withCutouts = [
    ...circuitJson,
    {
      type: "pcb_cutout",
      pcb_cutout_id: "left_cutout",
      subcircuit_id: "left",
      shape: "rect",
      center: { x: -15, y: 0 },
      width: 2,
      height: 2,
    },
    {
      type: "pcb_cutout",
      pcb_cutout_id: "right_cutout",
      shape: "polygon",
      points: [
        { x: 14, y: -1 },
        { x: 16, y: -1 },
        { x: 15, y: 1 },
      ],
    },
  ] as CircuitJson
  const step = await circuitJsonToStep(withCutouts, { exportMode: "assembly" })
  const imported = await importStepWithOcct(step)
  expect(imported.success).toBe(true)
  expect(imported.meshes).toHaveLength(2)

  // One cutout per board, each bounding that board's top and bottom face.
  // A board that also received the other board's cutout would have 8.
  expect(step.match(/= FACE_BOUND\(/g)).toHaveLength(4)
}, 30_000)
