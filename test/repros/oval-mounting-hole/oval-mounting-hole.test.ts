import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib"
import { expectFaceCoverage } from "../../utils/mesh-coverage"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./oval-mounting-hole.json"

// Core-generated fixture, reduced to the board and its holes:
// <board width={24} height={14} thickness={1.6}>
//   <hole shape="circle" diameter={3} pcbX={-6} />
//   <hole shape="oval" width={7} height={3} pcbX={5} />
// </board>

test("repro: non-plated oval mounting hole disappears from STEP", async () => {
  const step = await circuitJsonToStep(circuitJson as CircuitJson)
  const imported = await importStepWithOcct(step)
  expect(imported.success).toBe(true)
  const board = imported.meshes[0]!
  const mesh = {
    positions: board.attributes.position.array,
    indices: board.index.array,
    zTop: 0.8,
  }
  expectFaceCoverage(mesh, [[-6, 0]], false)
  // Records the bug: both board faces cover the oval hole's center.
  expectFaceCoverage(mesh, [[5, 0]], true)
  await expect(step).toMatchStepSnapshot(
    import.meta.path,
    "oval-mounting-hole",
    {
      camPos: [0, -16, 24],
      lookAt: [0, 0, 0],
      fov: 45,
    },
  )
})
