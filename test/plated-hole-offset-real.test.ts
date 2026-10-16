import { expect, test } from "bun:test"
import { circuitJsonToStep } from "../lib"
import fixture from "./fixtures/plated-hole-offset-real.json"
import { FULL_CIRCLE_SEGMENTS } from "../lib/pill-geometry"

/**
 * The production defect this guards: pcb_plated_hole carries a drill offset
 * from the pad centre, and it was never read, so every drill was emitted on the
 * pad centre instead.
 *
 * These four holes are real, taken from a pmp23595 board in the circuit json
 * dataset. They are the only plated holes in that dataset with a nonzero offset,
 * and they are the shape the audit reported: the offset is on one axis only,
 * with the other axis holding float noise around 1e-16.
 *
 * Expected positions are derived from each record's own x, y and offset fields
 * rather than from a hardcoded table, so this cannot drift from the fixture.
 */

const circuitJson = fixture as any[]

const TOLERANCE = 1e-6

/** All 2D coordinates present in the STEP text. */
const parsePoints = (stepText: string): { x: number; y: number }[] => {
  const points: { x: number; y: number }[] = []
  const pattern =
    /CARTESIAN_POINT\('',\((-?[\d.eE+-]+),(-?[\d.eE+-]+),(-?[\d.eE+-]+)\)/g
  for (const match of stepText.matchAll(pattern)) {
    points.push({ x: Number(match[1]), y: Number(match[2]) })
  }
  return points
}

/**
 * Drill centres in the STEP text. Every cylindrical wall face is anchored on
 * its drill axis, so the point feeding a CYLINDRICAL_SURFACE placement is the
 * hole centre.
 */
const parseDrillAxes = (stepText: string): { x: number; y: number }[] => {
  const points = new Map<string, { x: number; y: number }>()
  const pointPattern =
    /#(\d+) = CARTESIAN_POINT\('',\((-?[\d.eE+-]+),(-?[\d.eE+-]+),(-?[\d.eE+-]+)\)/g
  for (const match of stepText.matchAll(pointPattern)) {
    points.set(match[1]!, { x: Number(match[2]), y: Number(match[3]) })
  }

  const placements = new Map<string, string>()
  const placementPattern = /#(\d+) = AXIS2_PLACEMENT_3D\('',#(\d+),/g
  for (const match of stepText.matchAll(placementPattern)) {
    placements.set(match[1]!, match[2]!)
  }

  const axes: { x: number; y: number }[] = []
  for (const match of stepText.matchAll(
    /#\d+ = CYLINDRICAL_SURFACE\('',#(\d+),/g,
  )) {
    const point = points.get(placements.get(match[1]!) ?? "")
    if (point) axes.push(point)
  }
  return axes
}

const hasPointNear = (
  points: { x: number; y: number }[],
  x: number,
  y: number,
): boolean =>
  points.some(
    (point) =>
      Math.abs(point.x - x) < TOLERANCE && Math.abs(point.y - y) < TOLERANCE,
  )

const round = (value: number) => Number(value.toFixed(6))

test("real plated holes emit their drill at the offset position", async () => {
  const holes = circuitJson.filter((item) => item.type === "pcb_plated_hole")
  expect(holes).toHaveLength(4)

  const stepText = await circuitJsonToStep(structuredClone(circuitJson) as any)
  expect(stepText).toContain("MANIFOLD_SOLID_BREP")

  const axes = parseDrillAxes(stepText)
  // Each hole is bounded by FULL_CIRCLE_SEGMENTS arcs, so it contributes that
  // many cylindrical walls.
  expect(axes).toHaveLength(holes.length * FULL_CIRCLE_SEGMENTS)

  for (const hole of holes) {
    // Derived from the record itself, not from a table.
    const expectedX = hole.x + (hole.hole_offset_x ?? 0)
    const expectedY = hole.y + (hole.hole_offset_y ?? 0)

    expect({
      id: hole.pcb_plated_hole_id,
      emittedAtExpectedOffset: hasPointNear(axes, expectedX, expectedY),
      emittedAtPadCentreInstead: hasPointNear(axes, hole.x, hole.y),
    }).toEqual({
      id: hole.pcb_plated_hole_id,
      emittedAtExpectedOffset: true,
      emittedAtPadCentreInstead: false,
    })
  }
})

test("the real offsets are one axis only, with float noise on the other", async () => {
  // Documents the shape of the production case so the test above cannot
  // silently stop covering it. A diagonal synthetic offset would not catch a
  // regression that only mishandles one axis.
  const holes = circuitJson.filter((item) => item.type === "pcb_plated_hole")

  for (const hole of holes) {
    const offsetX = hole.hole_offset_x ?? 0
    const offsetY = hole.hole_offset_y ?? 0
    expect({
      id: hole.pcb_plated_hole_id,
      xIsNoise: Math.abs(offsetX) < 1e-9,
      yIsReal: Math.abs(offsetY) > 1,
      yOffset: round(offsetY),
    }).toEqual({
      id: hole.pcb_plated_hole_id,
      xIsNoise: true,
      yIsReal: true,
      yOffset: round(offsetY),
    })
  }
})

test("snapshot the real board with its offset drills", async () => {
  const stepText = await circuitJsonToStep(structuredClone(circuitJson) as any)
  await expect(stepText).toMatchStepSnapshot(
    import.meta.path,
    "plated-hole-offset-real",
  )
})

test("the board outline survives the conversion", async () => {
  const board = circuitJson.find((item) => item.type === "pcb_board")
  const stepText = await circuitJsonToStep(structuredClone(circuitJson) as any)
  const points = parsePoints(stepText)

  for (const vertex of board.outline) {
    const label = `${round(vertex.x)},${round(vertex.y)}`
    expect({
      vertex: label,
      present: hasPointNear(points, vertex.x, vertex.y),
    }).toEqual({ vertex: label, present: true })
  }
})
