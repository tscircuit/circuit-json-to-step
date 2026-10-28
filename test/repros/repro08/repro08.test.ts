import { test, expect } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import { expectFaceCoverage } from "../../utils/mesh-coverage"
import "../../fixtures/step-snapshot"
import circuitJson from "./repro08.json"

test("repro08: pcb_cutouts crossing the board edge notch the outline", async () => {
  const stepText = await circuitJsonToStep(circuitJson as any, {
    productName: "Repro08_EdgeNotches",
  })

  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)

  const mesh = {
    positions: occtResult.meshes[0]!.attributes.position.array as number[],
    indices: occtResult.meshes[0]!.index.array as number[],
    zTop: 0.8,
  }

  // Inside each notch and the internal hole: no board material.
  expectFaceCoverage(
    mesh,
    [
      [0, 13.5], // rounded rect notch in the top edge
      [18.5, 0], // half circle bitten out of the right edge
      [-19, -14], // polygon notch over the bottom-left corner
      [-8, 0], // internal circle stays an inner hole
    ],
    false,
  )
  // Board material right next to each notch is kept.
  expectFaceCoverage(
    mesh,
    [
      [-6, 13.5],
      [18.5, 4],
      [-14, -14],
      [-19, -9],
      [5, 0],
    ],
    true,
  )

  // Only the internal circle becomes an inner bound (top + bottom faces);
  // edge notches are part of the outer outline and the off-board cutout is
  // ignored.
  expect(stepText.match(/= FACE_BOUND\(/g)).toHaveLength(2)

  await expect(stepText).toMatchStepSnapshot(import.meta.path, "repro08")
}, 20000)
