import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib"
import circuitJson from "./plated-hole-offset-value.json"

/**
 * circuit-json types hole_offset_x/hole_offset_y as `distance`, the same
 * number | { value } union as x and y. The offset was added to the drill
 * centre without unwrapping { value }, so 5 + { value: 0.6 } became the
 * string "5[object Object]" and the whole export died in fmtNum with
 * "STEP real must be finite".
 */

/** Drill centres in the STEP text: the point feeding each CYLINDRICAL_SURFACE
 * placement is the hole centre (same probe as plated-hole-offset-real). */
const parseDrillAxes = (stepText: string): { x: number; y: number }[] => {
  const points = new Map<string, { x: number; y: number }>()
  for (const match of stepText.matchAll(
    /#(\d+) = CARTESIAN_POINT\('',\((-?[\d.eE+-]+),(-?[\d.eE+-]+),(-?[\d.eE+-]+)\)/g,
  )) {
    points.set(match[1]!, { x: Number(match[2]), y: Number(match[3]) })
  }
  const placements = new Map<string, string>()
  for (const match of stepText.matchAll(
    /#(\d+) = AXIS2_PLACEMENT_3D\('',#(\d+),/g,
  )) {
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

test("plated hole drill offsets encoded as { value } are applied to the drill centre", async () => {
  const step = await circuitJsonToStep(circuitJson as CircuitJson)
  expect(step).not.toContain("object Object")

  // x=5 with hole_offset_x={ value: 0.6 }, y=-1 with hole_offset_y={ value: -0.3 }
  const axes = parseDrillAxes(step)
  expect(axes.length).toBeGreaterThan(0)
  for (const axis of axes) {
    expect(axis).toEqual({ x: 5.6, y: -1.3 })
  }
})
