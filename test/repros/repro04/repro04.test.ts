import { test, expect } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import "../../fixtures/step-snapshot"
import circuitJson from "./repro04.json"

function getBounds(positions: number[]) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]

  for (let index = 0; index < positions.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], positions[index + axis])
      max[axis] = Math.max(max[axis], positions[index + axis])
    }
  }

  return { min, max }
}

test("repro04: convert a rounded business-card outline with holes to STEP", async () => {
  const stepText = await circuitJsonToStep(circuitJson as any, {
    includeComponents: false,
    productName: "Repro04_BusinessViaCard",
  })

  expect(stepText).toContain("ISO-10303-21")
  expect(stepText).toContain("END-ISO-10303-21")
  expect(stepText).toContain("Repro04_BusinessViaCard")
  expect(stepText).toContain("MANIFOLD_SOLID_BREP")

  expect((stepText.match(/CIRCLE/g) || []).length).toBe(10)
  expect((stepText.match(/CYLINDRICAL_SURFACE/g) || []).length).toBe(5)

  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)
  expect(occtResult.meshes.length).toBeGreaterThan(0)

  const positions = occtResult.meshes[0].attributes.position.array as number[]
  const offPlaneZ: number[] = []
  for (let index = 2; index < positions.length; index += 3) {
    const z = positions[index]!
    if (Math.abs(Math.abs(z) - 0.4) > 1e-6) offPlaneZ.push(z)
  }
  expect(offPlaneZ).toEqual([])

  const bounds = getBounds(positions)
  expect(bounds.min[0]).toBeCloseTo(-37.5, 4)
  expect(bounds.max[0]).toBeCloseTo(37.5, 4)
  expect(bounds.min[1]).toBeCloseTo(-27.5, 4)
  expect(bounds.max[1]).toBeCloseTo(27.5, 4)
  expect(bounds.min[2]).toBeCloseTo(-0.4, 4)
  expect(bounds.max[2]).toBeCloseTo(0.4, 4)

  await expect(stepText).toMatchStepSnapshot(import.meta.path, "repro04")
})
