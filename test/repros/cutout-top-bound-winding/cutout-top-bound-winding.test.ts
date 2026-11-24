import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib"
import circuitJson from "./cutout-top-bound-winding.json"

/**
 * A face's inner bound (FACE_BOUND) must wind opposite to its outer bound
 * seen from the face's outward normal: on the +Z top cap that means
 * clockwise seen from above, on the -Z bottom cap counter-clockwise. The
 * cutout geometry emits the same CCW loop on both caps, so the top cap's
 * hole bound travels the same way round as its outer bound and strict STEP
 * readers report the shell as oriented inconsistently (the same class of
 * defect as the bottom cap's outer loop in issue #197, here on the inner
 * bound of the top face). Rectangular and circular holes already wind
 * correctly on both caps.
 */

type Ent = { type: string; args: string }

const topLevelArgs = (s: string): string[] => {
  const out: string[] = []
  let depth = 0
  let cur = ""
  for (const ch of s) {
    if (ch === "(") depth++
    if (ch === ")") depth--
    if (ch === "," && depth === 0) {
      out.push(cur)
      cur = ""
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out
}

const parseEntities = (step: string): Map<string, Ent> => {
  const ents = new Map<string, Ent>()
  for (const line of step.split("\n")) {
    const m = line.match(/^#(\d+)\s*=\s*([A-Z_0-9]+)\((.*)\);?\s*$/)
    if (m) ents.set(m[1]!, { type: m[2]!, args: m[3]! })
  }
  return ents
}

const ref = (ent: Ent | undefined, index: number): string =>
  ent ? topLevelArgs(ent.args)[index]!.replace(/[#\s]/g, "") : ""

/** Signed XY area of a bound traversed in emitted order, seen from +Z. */
const boundSignedArea = (ents: Map<string, Ent>, boundId: string): number => {
  const bound = ents.get(boundId)!
  const loop = ents.get(ref(bound, 1))!
  const starts: [number, number][] = []
  for (const oeRef of [...loop.args.matchAll(/#(\d+)/g)]) {
    const oe = ents.get(oeRef[1]!)!
    const oeArgs = topLevelArgs(oe.args)
    const edge = ents.get(oeArgs[3]!.replace(/[#\s]/g, ""))!
    const vertex = ents.get(oeArgs[4] === ".T." ? ref(edge, 1) : ref(edge, 2))!
    const point = ents.get(vertex.args.match(/#(\d+)/)![1]!)!
    const [x, y] = topLevelArgs(point.args)[1]!
      .replace(/[()]/g, "")
      .split(",")
      .map(Number)
    starts.push([x!, y!])
  }
  let area = 0
  for (let i = 0; i < starts.length; i++) {
    const [x, y] = starts[i]!
    const [nx, ny] = starts[(i + 1) % starts.length]!
    area += x * ny - nx * y
  }
  return area / 2
}

test("cutout inner bound on the top cap winds opposite to the outer bound", async () => {
  const step = await circuitJsonToStep(circuitJson as CircuitJson)
  const ents = parseEntities(step)

  // Collect each horizontal cap's normal z and inner-bound signed areas.
  const caps: { normalZ: number; innerAreas: number[] }[] = []
  for (const [, ent] of ents) {
    if (ent.type !== "ADVANCED_FACE") continue
    const plane = ents.get(ref(ent, 2))
    if (!plane || plane.type !== "PLANE") continue
    const placement = ents.get(plane.args.match(/#(\d+)/)![1]!)!
    const axis = ents.get(ref(placement, 2))!
    const normal = topLevelArgs(axis.args)[1]!.replace(/[()]/g, "")
    const normalZ = Number(normal.split(",")[2])
    if (normalZ !== 1 && normalZ !== -1) continue
    const innerAreas = [...topLevelArgs(ent.args)[1]!.matchAll(/#(\d+)/g)]
      .map((m) => m[1]!)
      .filter((boundId) => ents.get(boundId)!.type === "FACE_BOUND")
      .map((boundId) => boundSignedArea(ents, boundId))
    caps.push({ normalZ, innerAreas })
  }

  expect(caps).toHaveLength(2)
  for (const cap of caps) {
    expect(cap.innerAreas).toHaveLength(1)
    for (const area of cap.innerAreas) {
      // Inner bounds oppose the face normal sense: negative on +Z, positive
      // on -Z (CCW seen from above reads as positive signed area).
      expect(Math.sign(area)).toBe(-cap.normalZ)
    }
  }
})
