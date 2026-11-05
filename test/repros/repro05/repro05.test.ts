import { expect, test } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { countCrossings } from "../../utils/occt/count-crossings"
import { importStepWithOcct } from "../../utils/occt/importer"
import { parseRepository, type EdgeLoop } from "stepts"

import circuitJsonFixture from "./repro05.json"
import type { CircuitJson } from "circuit-json"

// The JSON import widens `type` to string, so narrow it to the schema once here
// rather than casting at every use site.
const circuitJson = circuitJsonFixture as CircuitJson

// Source: sample014-usb-c-power-adapter, from the circuit json dataset.
// 21.9 x 52.5 mm board with seven circular holes, from 0.65 mm to 2.2 mm.

test("repro05: circular holes are only half cut in STEP exports", async () => {
  // Two STEP renders, the close-up at 1600x1200, run past Bun's 5s default.
  const stepText = await circuitJsonToStep(structuredClone(circuitJson))

  expect(stepText).toContain("ISO-10303-21")
  expect(stepText).toContain("END-ISO-10303-21")
  expect(stepText).toContain("MANIFOLD_SOLID_BREP")

  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)
  expect(occtResult.meshes).toHaveLength(1)
  const board = occtResult.meshes[0]!

  // Every circular hole in the fixture, plated or not, since the drill is cut
  // the same way for both.
  type Hole = Extract<
    CircuitJson[number],
    { type: "pcb_hole" | "pcb_plated_hole" }
  >
  const holes = circuitJson.filter(
    (item): item is Hole =>
      item.type === "pcb_hole" || item.type === "pcb_plated_hole",
  )
  expect(holes).toHaveLength(7)
  expect(holes.filter((hole) => hole.type === "pcb_hole")).toHaveLength(4)
  expect(holes.filter((hole) => hole.type === "pcb_plated_hole")).toHaveLength(
    3,
  )

  // Each circular hole should be open edge to edge, so a ray through its centre
  // should cross nothing at all.
  const crossingsAtHoleCentres = holes.map((hole) =>
    countCrossings({ mesh: board, x: hole.x, y: hole.y }),
  )
  expect(crossingsAtHoleCentres).toEqual([0, 0, 0, 0, 0, 0, 0])

  // Board material away from the holes is solid, entered and exited.
  expect(countCrossings({ mesh: board, x: 6.1, y: 0.4 })).toBe(2)
  expect(countCrossings({ mesh: board, x: 0.2, y: -8.7 })).toBe(2)

  // Every emitted loop must be a closed chain: each oriented edge ends where
  // the next one starts. Reversing a loop has to reverse the segment order as
  // well as the edge orientations, otherwise the hole's bottom boundary comes
  // out disconnected and occt accepts the file anyway.
  const repo = parseRepository(stepText)
  const loops = [...repo.entries()]
    .map(([, entity]) => entity)
    .filter((entity): entity is EdgeLoop => entity.type === "EDGE_LOOP")
  expect(loops.length).toBeGreaterThan(0)
  const disconnected: number[] = []
  for (const loop of loops) {
    const oriented = loop.edges.map((ref) => ref.resolve(repo))
    if (oriented.length < 2) continue
    for (let i = 0; i < oriented.length; i++) {
      const current = oriented[i]!
      const next = oriented[(i + 1) % oriented.length]!
      const currentCurve = current.edge.resolve(repo)
      const nextCurve = next.edge.resolve(repo)
      const currentEnd = (
        current.orientation ? currentCurve.end : currentCurve.start
      ).resolve(repo)
      const nextStart = (
        next.orientation ? nextCurve.start : nextCurve.end
      ).resolve(repo)
      if (currentEnd !== nextStart) {
        disconnected.push(i)
        break
      }
    }
  }
  expect(disconnected).toEqual([])

  // Whole board, so the reader can see this is a PCB and count all seven holes
  // rather than judging one of them. The ray casts above are the regression
  // guard; this is the visual record.
  await expect(stepText).toMatchStepSnapshot(import.meta.path, "repro05-board")
})
