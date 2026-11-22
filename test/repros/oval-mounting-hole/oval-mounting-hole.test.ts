import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib"
import { expectFaceCoverage } from "../../utils/mesh-coverage"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./oval-mounting-hole.json"

// Fixture reduced from:
// <board width={24} height={14} thickness={1.6}>
//   <hole shape="circle" diameter={3} pcbX={-6} />
//   <hole shape="oval" width={7} height={3} pcbX={5} />
// </board>

test("non-plated oval mounting holes cut through the exported board and panel", async () => {
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
  expectFaceCoverage(
    mesh,
    [
      [5, 0],
      [3, 0],
      [7, 0],
    ],
    false,
  )
  expectFaceCoverage(mesh, [[0, 0]], true)

  await expect(step).toMatchStepSnapshot(
    import.meta.path,
    "oval-mounting-hole",
    {
      camPos: [0, -16, 24],
      lookAt: [0, 0, 0],
      fov: 45,
    },
  )

  // Equal-dimension non-plated oval hole should also export as an open circular hole.
  const roundOvalStep = await circuitJsonToStep([
    ...(circuitJson as CircuitJson).filter((el) => el.type === "pcb_board"),
    {
      type: "pcb_hole",
      pcb_hole_id: "pcb_hole_round_oval",
      hole_shape: "oval",
      hole_width: 3,
      hole_height: 3,
      x: 0,
      y: 0,
    },
  ])
  const roundOvalImported = await importStepWithOcct(roundOvalStep)
  expect(roundOvalImported.success).toBe(true)
  const roundBoard = roundOvalImported.meshes[0]!
  expectFaceCoverage(
    {
      positions: roundBoard.attributes.position.array,
      indices: roundBoard.index.array,
      zTop: 0.8,
    },
    [[0, 0]],
    false,
  )

  // Non-plated oval hole inside a panel should also be cut open.
  const panelStep = await circuitJsonToStep([
    ...(circuitJson as CircuitJson),
    {
      type: "pcb_panel",
      pcb_panel_id: "panel_0",
      covered_with_solder_mask: true,
      width: 24,
      height: 14,
      center: { x: 0, y: 0 },
      thickness: 1.6,
    },
  ])
  const panelImported = await importStepWithOcct(panelStep)
  expect(panelImported.success).toBe(true)
  const panelBoard = panelImported.meshes[0]!
  expectFaceCoverage(
    {
      positions: panelBoard.attributes.position.array,
      indices: panelBoard.index.array,
      zTop: 0.8,
    },
    [
      [-6, 0],
      [5, 0],
    ],
    false,
  )
})
