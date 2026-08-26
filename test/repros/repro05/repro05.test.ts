import { test, expect } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import { expectFaceCoverage } from "../../utils/mesh-coverage"
import "../../fixtures/step-snapshot"
import circuitJson from "./repro05.json"

test("repro05: pcb_cutout circle/rect/polygon are cut out of the board", async () => {
  const stepText = await circuitJsonToStep(circuitJson as any, {
    productName: "Repro05_Cutouts",
  })

  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)

  const mesh = {
    positions: occtResult.meshes[0]!.attributes.position.array as number[],
    indices: occtResult.meshes[0]!.index.array as number[],
    zTop: 0.8,
  }

  // Points inside each cutout must not be covered by the top or bottom face.
  expectFaceCoverage(
    mesh,
    [
      [-12, 0], // circle
      [0, 0], // rect
      [12, -2], // polygon
    ],
    false,
  )
  // Points that must still be solid board.
  expectFaceCoverage(
    mesh,
    [
      [-18, 12],
      [0, 12],
      [18, -12],
      [12, 7], // just past the polygon cutout's apex at (12, 6)
    ],
    true,
  )

  // circle cutout -> one cylindrical wall; rect (4) + polygon (5) -> planar walls
  expect((stepText.match(/CYLINDRICAL_SURFACE/g) || []).length).toBe(1)

  await expect(stepText).toMatchStepSnapshot(import.meta.path, "repro05")
}, 20000)
