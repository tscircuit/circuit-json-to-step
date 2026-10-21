import { expect, test } from "bun:test"
import type {
  CircuitJson,
  PcbCutoutCircle,
  PcbCutoutPolygon,
  PcbCutoutRect,
} from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import { countCrossings } from "../../utils/occt/count-crossings"
import { importStepWithOcct } from "../../utils/occt/importer"
import "../../fixtures/step-snapshot"
import circuitJsonFixture from "./pcb-cutout-step-export.json"

// Source: sample024-pmp22650-main from tscircuit/dataset-srj24 (Apache-2.0).
// A slice of the real TI PMP22650 main PCB with circular, rectangular and
// polygonal cutouts. The Altium converter emits every cutout as a polygon, so
// the circle and rectangle are restored to their native shapes here. Board
// outline coordinates are rounded to 0.0001 mm to avoid noisy near-zero
// direction cosines in the STEP text.
//
// The JSON import widens `type` to string, so narrow it to the schema once here
// rather than casting at every use site.
const circuitJson = circuitJsonFixture as CircuitJson

test("repro: pcb_cutout geometry is missing from STEP exports", async () => {
  const stepText = await circuitJsonToStep(structuredClone(circuitJson))

  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)
  expect(occtResult.meshes).toHaveLength(1)
  const board = occtResult.meshes[0]!

  const circleCutout = circuitJson.find(
    (element): element is PcbCutoutCircle =>
      element.type === "pcb_cutout" &&
      element.shape === "circle" &&
      element.pcb_cutout_id === "pcb_cutout_altium_0",
  )!
  const rectCutout = circuitJson.find(
    (element): element is PcbCutoutRect =>
      element.type === "pcb_cutout" &&
      element.shape === "rect" &&
      element.pcb_cutout_id === "pcb_cutout_altium_23",
  )!
  const polygonCutout = circuitJson.find(
    (element): element is PcbCutoutPolygon =>
      element.type === "pcb_cutout" &&
      element.shape === "polygon" &&
      element.pcb_cutout_id === "pcb_cutout_altium_22",
  )!
  expect(polygonCutout.points.length).toBeGreaterThan(3)
  const polygonVertexSum = polygonCutout.points.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
    { x: 0, y: 0 },
  )
  const polygonProbe = {
    x: polygonVertexSum.x / polygonCutout.points.length,
    y: polygonVertexSum.y / polygonCutout.points.length,
  }

  // Each probe is inside a cutout and should be empty space (0 crossings). The
  // exporter currently ignores pcb_cutout, so every ray hits the board twice.
  expect(
    countCrossings({
      mesh: board,
      x: circleCutout.center.x,
      y: circleCutout.center.y,
    }),
  ).toBe(2)
  expect(
    countCrossings({
      mesh: board,
      x: rectCutout.center.x,
      y: rectCutout.center.y,
    }),
  ).toBe(2)
  // The vertex average is inside the large polygonal transformer cutout.
  expect(
    countCrossings({
      mesh: board,
      x: polygonProbe.x,
      y: polygonProbe.y,
    }),
  ).toBe(2)

  await expect(stepText).toMatchStepSnapshot(
    import.meta.path,
    "pcb-cutout-step-export",
  )
})
