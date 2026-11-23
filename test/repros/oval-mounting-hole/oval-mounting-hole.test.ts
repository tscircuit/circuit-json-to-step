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

test("non-plated oval mounting holes remain elliptical in STEP", async () => {
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
      [7, 1],
    ],
    false,
  )
  // Outside the ellipse, but inside a 7 x 3 rounded slot: keep this material.
  expectFaceCoverage(mesh, [[7, 1.4]], true)
  await expect(step).toMatchStepSnapshot(
    import.meta.path,
    "oval-mounting-hole",
    {
      camPos: [0, -16, 24],
      lookAt: [0, 0, 0],
      fov: 45,
    },
  )

  // Exercise horizontal, vertical and circular ovals in both export paths.
  for (const [width, height] of [
    [7, 3],
    [3, 7],
    [3, 3],
  ]) {
    const fixture = (circuitJson as CircuitJson).map((item) =>
      item.type === "pcb_hole" && item.hole_shape === "oval"
        ? { ...item, hole_width: width, hole_height: height }
        : item,
    )
    for (const panel of [false, true]) {
      const exported = await circuitJsonToStep(
        panel
          ? [
              ...fixture,
              {
                type: "pcb_panel",
                pcb_panel_id: "panel",
                covered_with_solder_mask: true,
                center: { x: 0, y: 0 },
                width: 24,
                height: 14,
                thickness: 1.6,
              },
            ]
          : fixture,
      )
      const result = await importStepWithOcct(exported)
      expect(result.success).toBe(true)
      const substrate = result.meshes[0]!
      const geometry = {
        positions: substrate.attributes.position.array,
        indices: substrate.index.array,
        zTop: 0.8,
      }
      expectFaceCoverage(
        geometry,
        [
          [5, 0],
          [5 + width / 4, height / 4],
        ],
        false,
      )
      // Within the bounding rectangle but outside the ellipse.
      expectFaceCoverage(geometry, [[5 + width * 0.4, height * 0.4]], true)
    }
  }
})
