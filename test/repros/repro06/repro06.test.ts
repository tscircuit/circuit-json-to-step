import { test, expect } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import { expectFaceCoverage } from "../../utils/mesh-coverage"
import "../../fixtures/step-snapshot"
import circuitJson from "./repro06.json"

test("repro06: rect pcb_cutout corners are rounded by corner_radius", async () => {
  const stepText = await circuitJsonToStep(circuitJson as any, {
    productName: "Repro06_RoundedCutouts",
  })

  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)

  const mesh = {
    positions: occtResult.meshes[0]!.attributes.position.array as number[],
    indices: occtResult.meshes[0]!.index.array as number[],
    zTop: 0.8,
  }

  expectFaceCoverage(
    mesh,
    [
      [-11, 4], // rotated slot (corner_radius == height / 2)
      [11, -4], // partially rounded rect
      [-11, -8], // corner_radius clamped to half the smaller side
    ],
    false,
  )

  expectFaceCoverage(
    mesh,
    [
      // Past the rotated slot's rounded end (half length 7 along 30deg).
      [-11 + 8 * Math.cos(Math.PI / 6), 4 + 8 * Math.sin(Math.PI / 6)],
      // Corner of cutout 2's bounding rect, outside its r=2 corner arc.
      [15.8, -0.2],
      // Corner of cutout 3's bounding rect, outside its r=3 corner arc.
      [-13.9, -10.9],
      // Cutout 4 sits here with height 0; it must be skipped rather than
      // built as a zero-area hole.
      [0, 12],
    ],
    true,
  )

  // Four rounded corners per rect, and none of them collapsed into planes.
  expect((stepText.match(/CYLINDRICAL_SURFACE/g) || []).length).toBe(12)
  // Two inner bounds (top and bottom) per cutout, so the zero-height cutout 4
  // contributed nothing at all rather than a zero-area hole occt would ignore.
  expect((stepText.match(/FACE_BOUND\(/g) || []).length).toBe(3 * 2)

  await expect(stepText).toMatchStepSnapshot(import.meta.path, "repro06")
}, 20000)
