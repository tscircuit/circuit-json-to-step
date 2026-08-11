import { test, expect } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import "../../fixtures/step-snapshot"
import circuitJson from "./repro05.json"

/** True if (x, y) is covered by a triangle of the mesh lying on plane z. */
function isCoveredAtZ(
  positions: number[],
  indices: number[],
  z: number,
  x: number,
  y: number,
) {
  const sign = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
  ) => (ax - cx) * (by - cy) - (bx - cx) * (ay - cy)

  for (let i = 0; i < indices.length; i += 3) {
    const p = [0, 1, 2].map((k) => {
      const base = indices[i + k]! * 3
      return [positions[base]!, positions[base + 1]!, positions[base + 2]!]
    })
    if (p.some((point) => Math.abs(point[2]! - z) > 1e-6)) continue

    const d1 = sign(x, y, p[0]![0]!, p[0]![1]!, p[1]![0]!, p[1]![1]!)
    const d2 = sign(x, y, p[1]![0]!, p[1]![1]!, p[2]![0]!, p[2]![1]!)
    const d3 = sign(x, y, p[2]![0]!, p[2]![1]!, p[0]![0]!, p[0]![1]!)
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0
    if (!(hasNeg && hasPos)) return true
  }
  return false
}

test("repro05: pcb_cutout circle/rect/polygon are cut out of the board", async () => {
  const stepText = await circuitJsonToStep(circuitJson as any, {
    productName: "Repro05_Cutouts",
  })

  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)

  const positions = occtResult.meshes[0]!.attributes.position.array as number[]
  const indices = occtResult.meshes[0]!.index.array as number[]

  // Points inside each cutout must not be covered by the top or bottom face.
  const insideCutouts: [number, number][] = [
    [-12, 0], // circle
    [0, 0], // rect
    [12, -2], // polygon
  ]
  // Points that must still be solid board.
  const onBoard: [number, number][] = [
    [-18, 12],
    [0, 12],
    [18, -12],
    [12, 7], // just past the polygon cutout's apex at (12, 6)
  ]

  for (const z of [0.8, -0.8]) {
    for (const [x, y] of insideCutouts) {
      expect([z, x, y, isCoveredAtZ(positions, indices, z, x, y)]).toEqual([
        z,
        x,
        y,
        false,
      ])
    }
    for (const [x, y] of onBoard) {
      expect([z, x, y, isCoveredAtZ(positions, indices, z, x, y)]).toEqual([
        z,
        x,
        y,
        true,
      ])
    }
  }

  // circle cutout -> one cylindrical wall; rect (4) + polygon (5) -> planar walls
  expect((stepText.match(/CYLINDRICAL_SURFACE/g) || []).length).toBe(1)

  await expect(stepText).toMatchStepSnapshot(import.meta.path, "repro05")
}, 20000)
