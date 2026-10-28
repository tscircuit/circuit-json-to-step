import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics19.json"
import { fullCircleSegments } from "../../../lib/pill-geometry"

test("basics19: multi-board assemblies include every board and reject ambiguous hole ownership", async () => {
  const step = await circuitJsonToStep(circuitJson as CircuitJson)
  const imported = await importStepWithOcct(step)
  expect(imported.root.children[0].children.map((child) => child.name)).toEqual(
    ["LEFT_PCB", "RIGHT_PCB"],
  )
  expect(imported.meshes).toHaveLength(2)
  for (const [index, bounds] of [
    [
      [-20, -10],
      [-3, 3],
      [-0.8, 0.8],
    ],
    [
      [11, 19],
      [-2, 2],
      [-1, 1],
    ],
  ].entries()) {
    for (const [axis, [min, max]] of bounds.entries()) {
      const values = imported.meshes[index].attributes.position.array.filter(
        (_, i) => i % 3 === axis,
      )
      expect(Math.min(...values)).toBeCloseTo(min)
      expect(Math.max(...values)).toBeCloseTo(max)
    }
  }
  const withHole = [
    ...circuitJson,
    {
      type: "pcb_hole",
      pcb_hole_id: "left_hole",
      subcircuit_id: "left",
      hole_shape: "circle",
      hole_diameter: 2,
      x: -15,
      y: 0,
    },
  ] as CircuitJson
  const holeStep = await circuitJsonToStep(withHole, { exportMode: "assembly" })
  expect(holeStep.match(/= CIRCLE\(/g)).toHaveLength(2 * fullCircleSegments)
  expect((await importStepWithOcct(holeStep)).meshes).toHaveLength(2)
  const outlined = structuredClone(withHole)
  const leftOutline = outlined[0]
  if (leftOutline.type !== "pcb_board") throw new Error("Missing board fixture")
  leftOutline.outline = [
    { x: -20, y: -3 },
    { x: -10, y: -3 },
    { x: -10, y: 3 },
    { x: -20, y: 3 },
  ]
  const untagged = outlined[2]
  if (untagged.type !== "pcb_hole") throw new Error("Missing hole fixture")
  untagged.subcircuit_id = undefined
  const outlinedStep = await circuitJsonToStep(outlined, {
    exportMode: "assembly",
  })
  expect(outlinedStep.match(/= CIRCLE\(/g)).toHaveLength(2 * fullCircleSegments)
  expect((await importStepWithOcct(outlinedStep)).meshes).toHaveLength(2)
  const ambiguous = structuredClone(withHole)
  const right = ambiguous[1]
  if (right.type !== "pcb_board") throw new Error("Missing board fixture")
  right.center = { x: -15, y: 0 }
  const hole = ambiguous[2]
  if (hole.type !== "pcb_hole") throw new Error("Missing hole fixture")
  hole.subcircuit_id = undefined
  await expect(
    circuitJsonToStep(ambiguous, { exportMode: "assembly" }),
  ).rejects.toThrow("Cannot determine which PCB owns a hole")
}, 30_000)
