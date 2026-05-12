import { expect, test } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct, type OcctMesh } from "../../utils/occt/importer"

type Bounds = {
  min: { x: number; y: number; z: number }
  max: { x: number; y: number; z: number }
}

function computeBounds(mesh: OcctMesh): Bounds | null {
  const positions = mesh.attributes.position?.array ?? []
  if (!positions.length) return null

  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]!
    const y = positions[i + 1]!
    const z = positions[i + 2]!
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    if (z > maxZ) maxZ = z
  }

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  }
}

function combineBounds(bounds: Bounds[]): Bounds {
  return bounds.reduce((combined, current) => ({
    min: {
      x: Math.min(combined.min.x, current.min.x),
      y: Math.min(combined.min.y, current.min.y),
      z: Math.min(combined.min.z, current.min.z),
    },
    max: {
      x: Math.max(combined.max.x, current.max.x),
      y: Math.max(combined.max.y, current.max.y),
      z: Math.max(combined.max.z, current.max.z),
    },
  }))
}

test("repro04: exports rectangular pcb artwork solids", async () => {
  const stepText = await circuitJsonToStep(
    [
      {
        type: "pcb_board",
        width: 12,
        height: 10,
        center: { x: 0, y: 0 },
        thickness: 1.6,
      },
      {
        type: "pcb_smtpad",
        shape: "rect",
        pcb_smtpad_id: "top_rect_pad",
        x: -2,
        y: 1,
        width: 2,
        height: 1,
        layer: "top",
      },
      {
        type: "pcb_smtpad",
        shape: "rotated_rect",
        pcb_smtpad_id: "bottom_rotated_pad",
        x: 2,
        y: -1,
        width: 2,
        height: 1,
        layer: "bottom",
        ccw_rotation: 45,
      },
      {
        type: "pcb_solder_paste",
        shape: "rect",
        pcb_solder_paste_id: "paste_rect",
        x: 0,
        y: 2,
        width: 1.5,
        height: 0.75,
        layer: "top",
      },
      {
        type: "pcb_silkscreen_rect",
        pcb_silkscreen_rect_id: "outline_rect",
        center: { x: 0, y: -2 },
        width: 3,
        height: 1.5,
        layer: "top",
        stroke_width: 0.15,
      },
    ] as any,
    { productName: "RectArtwork" },
  )

  expect(stepText).toContain("RectArtwork")
  expect(stepText).toContain("top_rect_pad")
  expect(stepText).toContain("bottom_rotated_pad")
  expect(stepText).toContain("paste_rect")
  expect(stepText).toContain("outline_rect_top")
  expect(stepText).toContain("outline_rect_bottom")
  expect(stepText).toContain("outline_rect_left")
  expect(stepText).toContain("outline_rect_right")

  const solidCount = (stepText.match(/MANIFOLD_SOLID_BREP/g) || []).length
  expect(solidCount).toBe(8)

  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)
  expect(occtResult.meshes.length).toBeGreaterThan(0)
})

test("repro04: rotates outlined silkscreen rectangle segment centers", async () => {
  const stepText = await circuitJsonToStep(
    [
      {
        type: "pcb_board",
        width: 8,
        height: 8,
        center: { x: 0, y: 0 },
        thickness: 1.6,
      },
      {
        type: "pcb_silkscreen_rect",
        pcb_silkscreen_rect_id: "rotated_outline",
        center: { x: 0, y: 0 },
        width: 4,
        height: 2,
        layer: "top",
        stroke_width: 0.2,
        rotation: 90,
      },
    ] as any,
    { productName: "RotatedOutline" },
  )

  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)

  const silkscreenBounds = occtResult.meshes
    .map(computeBounds)
    .filter((bounds): bounds is Bounds => {
      if (!bounds) return false
      return bounds.max.z - bounds.min.z < 0.1
    })
  expect(silkscreenBounds.length).toBeGreaterThan(0)

  const combined = combineBounds(silkscreenBounds)
  expect(combined.max.x - combined.min.x).toBeCloseTo(2, 1)
  expect(combined.max.y - combined.min.y).toBeCloseTo(4, 1)
})
