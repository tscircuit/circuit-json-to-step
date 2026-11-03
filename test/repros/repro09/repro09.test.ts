import { test, expect } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import { expectFaceCoverage } from "../../utils/mesh-coverage"
import "../../fixtures/step-snapshot"
import circuitJson from "./repro09.json"

test("repro09: pill plated holes with a round drill export as circular holes", async () => {
  const stepText = await circuitJsonToStep(circuitJson as any, {
    productName: "Repro09_RoundDrillPills",
  })

  // A round drill leaves the pill no straight sides; building them anyway
  // produced zero-length edges and NaN wall plane directions.
  expect(stepText).not.toContain("NaN")

  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)

  const mesh = {
    positions: occtResult.meshes[0]!.attributes.position.array as number[],
    indices: occtResult.meshes[0]!.index.array as number[],
    zTop: 0.8,
  }

  // Drill centres (the last one is offset 0.5mm from its pad), each 0.95mm.
  const drills: [number, number][] = [
    [-2.5, 2],
    [2.5, 2],
    [-2.5, -2],
    [2.5, -2],
  ]
  const radius = 0.95 / 2
  expectFaceCoverage(
    mesh,
    drills.flatMap(([x, y]): [number, number][] => [
      [x, y],
      [x + radius - 0.1, y],
      [x, y + radius - 0.1],
    ]),
    false,
  )
  expectFaceCoverage(
    mesh,
    drills.flatMap(([x, y]): [number, number][] => [
      [x + radius + 0.1, y],
      [x - radius - 0.1, y],
      [x, y + radius + 0.1],
      [x, y - radius - 0.1],
    ]),
    true,
  )

  // Each hole is walled by two half cylinders and no planar sides, the same
  // as a circular plated hole.
  expect(stepText.match(/= CYLINDRICAL_SURFACE\(/g)).toHaveLength(8)

  await expect(stepText).toMatchStepSnapshot(import.meta.path, "repro09")
}, 20000)
