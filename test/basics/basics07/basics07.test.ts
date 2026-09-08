import { expect, test } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { getPillGeometry } from "../../../lib/pill-geometry"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics07.json"

function cartesianPoints(stepText: string) {
  const points: { x: number; y: number; z: number }[] = []
  const pattern = /CARTESIAN_POINT\(''\s*,\s*\(([^)]+)\)/g
  for (const match of stepText.matchAll(pattern)) {
    const [x, y, z] = match[1]!.split(",").map((value) => Number(value.trim()))
    if ([x, y, z].some((value) => Number.isNaN(value))) continue
    points.push({ x: x!, y: y!, z: z! })
  }
  return points
}

function bounds(points: { x: number; y: number }[]): {
  minX: number
  maxX: number
  minY: number
  maxY: number
} {
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
  }
}

test("basics07: cut drills for modern plated-hole pad shapes", async () => {
  const rotated = getPillGeometry({
    x: 12,
    y: 0,
    hole_width: 1,
    hole_height: 3,
    hole_ccw_rotation: 90,
  })
  expect(rotated.rotation).toBeCloseTo(Math.PI / 2)

  const stepText = await circuitJsonToStep(circuitJson as any, {
    productName: "TestPCB_PlatedHoleShapes",
  })

  expect(stepText).toContain("ISO-10303-21")
  expect(stepText).toContain("END-ISO-10303-21")
  expect(stepText).toContain("TestPCB_PlatedHoleShapes")
  expect(stepText).toContain("MANIFOLD_SOLID_BREP")

  const cylinderCount = (stepText.match(/CYLINDRICAL_SURFACE/g) || []).length
  expect(cylinderCount).toBe(6)

  const points = cartesianPoints(stepText)
  const offsetCircle = points.filter(
    (point) =>
      Math.abs(point.y) < 0.05 &&
      point.x > -11.1 &&
      point.x < -8.9 &&
      Math.abs(Math.abs(point.z) - 0.8) < 0.05,
  )
  expect(offsetCircle.length).toBeGreaterThan(0)

  const unrotatedPill = points.filter(
    (point) =>
      Math.abs(point.x) < 0.6 &&
      Math.abs(point.y) < 1.1 &&
      Math.abs(Math.abs(point.z) - 0.8) < 0.05,
  )
  const unrotatedBounds = bounds(unrotatedPill)
  expect(unrotatedBounds.maxY - unrotatedBounds.minY).toBeCloseTo(2, 5)
  expect(unrotatedBounds.maxX - unrotatedBounds.minX).toBeCloseTo(1, 5)

  const rotatedPill = points.filter(
    (point) =>
      point.x > 10.9 &&
      point.x < 13.1 &&
      Math.abs(point.y) < 0.6 &&
      Math.abs(Math.abs(point.z) - 0.8) < 0.05,
  )
  const rotatedBounds = bounds(rotatedPill)
  expect(rotatedBounds.maxX - rotatedBounds.minX).toBeCloseTo(2, 5)
  expect(rotatedBounds.maxY - rotatedBounds.minY).toBeCloseTo(1, 5)

  const outputPath = "debug-output/basics07.step"
  await Bun.write(outputPath, stepText)

  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)
  expect(occtResult.meshes.length).toBeGreaterThan(0)

  await expect(stepText).toMatchStepSnapshot(import.meta.path, "basics07")
}, 30000)
