import { expect, test } from "bun:test"
import { circuitJsonToStep } from "../lib"
import fixture from "./fixtures/plated-hole-variants.json"

/**
 * Coverage for every pcb_plated_hole schema variant.
 *
 * Two of these six have no instance anywhere in the circuit json dataset:
 * pill_hole_with_rect_pad, and shape "oval", which real producers emit as
 * "pill" instead. Two more, rotated_pill_hole_with_rect_pad and
 * hole_with_polygon_pad, exist but never with a nonzero offset. So this
 * fixture is what proves the dispatch routes each variant and applies the
 * offset to each one.
 *
 * The real production case, where the offset is on one axis only, lives in
 * plated-hole-offset-real.test.ts. This fixture uses a diagonal offset so both
 * axes are exercised.
 *
 * Two schema facts shape the table. The plain circle and oval variants have no
 * hole_offset fields at all, so their drill is on the pad centre. And
 * hole_with_polygon_pad routes by hole_shape, not by its own shape value.
 */

const OFFSET_X = 0.5
const OFFSET_Y = 0.3

const board = (fixture as any[])[0]!
const platedHoles = (fixture as any[]).filter(
  (item) => item.type === "pcb_plated_hole",
)

type Row = {
  variant: string
  id: string
  padX: number
  padY: number
  /** True when the schema gives this variant offset fields. */
  hasOffsetFields: boolean
}

const rows: Row[] = [
  {
    variant: "PcbPlatedHoleCircle",
    id: "plain_circle",
    padX: -20,
    padY: -12,
    hasOffsetFields: false,
  },
  {
    variant: "PcbPlatedHoleOval",
    id: "plain_oval",
    padX: -8,
    padY: -12,
    hasOffsetFields: false,
  },
  {
    variant: "PcbHoleCircularWithRectPad",
    id: "circle_with_rect_pad",
    padX: 4,
    padY: -12,
    hasOffsetFields: true,
  },
  {
    variant: "PcbHolePillWithRectPad",
    id: "pill_with_rect_pad",
    padX: 16,
    padY: -12,
    hasOffsetFields: true,
  },
  {
    variant: "PcbHoleRotatedPillWithRectPad",
    id: "rotated_pill_with_rect_pad",
    padX: -20,
    padY: 8,
    hasOffsetFields: true,
  },
  {
    variant: "PcbHoleWithPolygonPad",
    id: "polygon_pad_with_pill_hole",
    padX: 4,
    padY: 8,
    hasOffsetFields: true,
  },
]

/** Drill centre a row must produce. */
const expectedCentre = (row: Row) => ({
  x: row.hasOffsetFields ? row.padX + OFFSET_X : row.padX,
  y: row.hasOffsetFields ? row.padY + OFFSET_Y : row.padY,
})

const holeById = (id: string) => {
  const hole = platedHoles.find((item) => item.pcb_plated_hole_id === id)
  if (!hole) throw new Error(`missing fixture hole ${id}`)
  return structuredClone(hole) as any
}

const singleHoleCircuit = (hole: any) => structuredClone([board, hole]) as any[]

test("fixture holds one of each of the six schema variants", () => {
  expect(platedHoles).toHaveLength(6)
  expect(new Set(platedHoles.map((hole) => hole.shape)).size).toBe(6)
  // Both variants with no real instance in the dataset are present.
  expect(platedHoles.map((hole) => hole.shape)).toContain("oval")
  expect(platedHoles.map((hole) => hole.shape)).toContain(
    "pill_hole_with_rect_pad",
  )
})

test("every variant emits a hole, including the two that previously emitted nothing", async () => {
  const bareBoard = await circuitJsonToStep(structuredClone([board]) as any[])

  for (const row of rows) {
    const withHole = await circuitJsonToStep(
      singleHoleCircuit(holeById(row.id)),
    )
    expect({
      variant: row.variant,
      differsFromBareBoard: withHole !== bareBoard,
      hasCircle: withHole.includes("CIRCLE("),
      hasCylinder: withHole.includes("CYLINDRICAL_SURFACE"),
    }).toEqual({
      variant: row.variant,
      differsFromBareBoard: true,
      hasCircle: true,
      hasCylinder: true,
    })
  }
})

test("the drill sits at the expected centre for every variant", async () => {
  for (const row of rows) {
    const hole = holeById(row.id)
    const expected = expectedCentre(row)

    if (!row.hasOffsetFields) {
      // No offset fields exist, so the drill must be on the pad centre.
      expect({
        variant: row.variant,
        hasOffsetField: "hole_offset_x" in hole,
        offsetX: hole.hole_offset_x,
      }).toEqual({
        variant: row.variant,
        hasOffsetField: false,
        offsetX: undefined,
      })
    } else {
      expect({
        variant: row.variant,
        offsetX: hole.hole_offset_x,
        offsetY: hole.hole_offset_y,
      }).toEqual({
        variant: row.variant,
        offsetX: OFFSET_X,
        offsetY: OFFSET_Y,
      })
    }

    // Translation invariance: a variant emitted at pad centre plus offset must
    // match the same variant moved to that point with no offset set. This holds
    // for every drill shape, unlike reading a centre back out of the STEP text,
    // which a pill never emits and a single CIRCLE edge does not expose.
    const reference = holeById(row.id)
    reference.x = expected.x
    reference.y = expected.y
    if (row.hasOffsetFields) {
      reference.hole_offset_x = 0
      reference.hole_offset_y = 0
    }

    const actual = await circuitJsonToStep(singleHoleCircuit(hole))
    const displaced = await circuitJsonToStep(singleHoleCircuit(reference))

    expect({
      variant: row.variant,
      matchesDisplacedForm: actual === displaced,
      expectedCentre: expected,
    }).toEqual({
      variant: row.variant,
      matchesDisplacedForm: true,
      expectedCentre: expected,
    })
  }
})

test("the offset variants genuinely disagree with the same hole without the offset", async () => {
  // Inverse guard. If the emitter ignored the offset, the assertions above would
  // still hold and this would be the only thing to notice.
  for (const row of rows.filter((r) => r.hasOffsetFields)) {
    const withOffset = holeById(row.id)
    const withoutOffset = holeById(row.id)
    withoutOffset.hole_offset_x = 0
    withoutOffset.hole_offset_y = 0

    const actual = await circuitJsonToStep(singleHoleCircuit(withOffset))
    const ignored = await circuitJsonToStep(singleHoleCircuit(withoutOffset))

    expect({
      variant: row.variant,
      differs: actual !== ignored,
    }).toEqual({ variant: row.variant, differs: true })
  }
})

test("circular variants expose a literal cylinder axis at the offset centre", async () => {
  // A direct coordinate read, for the variants whose drill is a single
  // CYLINDRICAL_SURFACE. Complements the shape-agnostic invariance check above.
  const circularRows = rows.filter(
    (row) =>
      holeById(row.id).hole_shape === "circle" ||
      holeById(row.id).shape === "circle",
  )
  expect(circularRows.length).toBeGreaterThan(0)

  for (const row of circularRows) {
    const stepText = await circuitJsonToStep(
      singleHoleCircuit(holeById(row.id)),
    )
    const points = new Map<string, { x: number; y: number }>()
    for (const match of stepText.matchAll(
      /#(\d+) = CARTESIAN_POINT\('',\((-?[\d.eE+-]+),(-?[\d.eE+-]+),/g,
    )) {
      points.set(match[1]!, { x: Number(match[2]), y: Number(match[3]) })
    }
    const placements = new Map<string, string>()
    for (const match of stepText.matchAll(
      /#(\d+) = AXIS2_PLACEMENT_3D\('',#(\d+),/g,
    )) {
      placements.set(match[1]!, match[2]!)
    }

    const expected = expectedCentre(row)
    let found = false
    for (const match of stepText.matchAll(
      /#\d+ = CYLINDRICAL_SURFACE\('',#(\d+),/g,
    )) {
      const axis = points.get(placements.get(match[1]!) ?? "")
      if (
        axis &&
        Math.abs(axis.x - expected.x) < 1e-6 &&
        Math.abs(axis.y - expected.y) < 1e-6
      ) {
        found = true
      }
    }

    expect({ variant: row.variant, axisAtExpectedCentre: found }).toEqual({
      variant: row.variant,
      axisAtExpectedCentre: true,
    })
  }
})
