import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import rectangularBoard from "./basics25.json"

type StepEntity = { type: string; args: string }

function parseStepEntities(stepText: string): Map<string, StepEntity> {
  const entities = new Map<string, StepEntity>()
  for (const match of stepText.matchAll(
    /#(\d+)\s*=\s*([A-Z0-9_]+)\(([^;]*)\);/g,
  )) {
    entities.set(`#${match[1]}`, {
      type: match[2]!,
      args: match[3]!.trim(),
    })
  }
  return entities
}

function refsIn(text: string): string[] {
  return Array.from(text.matchAll(/#\d+/g), (match) => match[0])
}

function verifyBoardCapWindingAndShellConsistency(
  stepText: string,
  expectedAreaMm2: number,
) {
  const entities = parseStepEntities(stepText)

  const pointOf = (vertexRef: string) => {
    const pointRef = refsIn(entities.get(vertexRef)!.args)[0]!
    const coords = entities
      .get(pointRef)!
      .args.match(/-?\d+(?:\.\d+)?(?:E[+-]?\d+)?/gi)!
      .map(Number)
    return { x: coords[0]!, y: coords[1]!, z: coords[2]! }
  }

  const directionOf = (dirRef: string) => {
    const coords = entities
      .get(dirRef)!
      .args.match(/-?\d+(?:\.\d+)?(?:E[+-]?\d+)?/gi)!
      .map(Number)
    return { x: coords[0]!, y: coords[1]!, z: coords[2]! }
  }

  const brep = Array.from(entities.values()).find(
    (entity) => entity.type === "MANIFOLD_SOLID_BREP",
  )!
  const shellRef = refsIn(brep.args)[0]!
  const faceRefs = refsIn(entities.get(shellRef)!.args)

  // Every shared edge across the outer shell must appear once forward (.T.)
  // and once reversed (.F.) when all planar faces have same_sense = .T.
  const edgeOrientations = new Map<string, boolean[]>()
  let bottomSignedAreaXY = 0
  let topSignedAreaXY = 0

  for (const faceRef of faceRefs) {
    const face = entities.get(faceRef)!
    expect(face.type).toBe("ADVANCED_FACE")
    expect(face.args.endsWith(".T.")).toBe(true)

    const boundListMatch = face.args.match(/\(([^()]*)\)/)!
    const boundRefs = refsIn(boundListMatch[1]!)
    const afterBounds = face.args.slice(
      boundListMatch.index! + boundListMatch[0].length,
    )
    const surfaceRef = refsIn(afterBounds)[0]!
    const surface = entities.get(surfaceRef)!

    const outerBoundRef = boundRefs.find(
      (ref) => entities.get(ref)?.type === "FACE_OUTER_BOUND",
    )!
    const outerBound = entities.get(outerBoundRef)!
    const outerBoundPositive = outerBound.args.endsWith(".T.")
    const loopRef = refsIn(outerBound.args)[0]!
    const orientedEdgeRefs = refsIn(entities.get(loopRef)!.args)

    const orderedOrientedEdges = outerBoundPositive
      ? orientedEdgeRefs
      : [...orientedEdgeRefs].reverse()

    const loopVertices: { x: number; y: number; z: number }[] = []
    let expectedStartVertex: string | null = null
    let firstStartVertex: string | null = null

    for (const orientedRef of orderedOrientedEdges) {
      const oriented = entities.get(orientedRef)!
      const edgeCurveRef = refsIn(oriented.args)[0]!
      const edgePositive = oriented.args.endsWith(".T.") === outerBoundPositive
      const list = edgeOrientations.get(edgeCurveRef) ?? []
      list.push(edgePositive)
      edgeOrientations.set(edgeCurveRef, list)

      const [vStart, vEnd] = refsIn(entities.get(edgeCurveRef)!.args)
      const startRef = edgePositive ? vStart! : vEnd!
      const endRef = edgePositive ? vEnd! : vStart!

      if (expectedStartVertex !== null) {
        expect(startRef).toBe(expectedStartVertex)
      } else {
        firstStartVertex = startRef
      }
      expectedStartVertex = endRef
      loopVertices.push(pointOf(startRef))
    }
    expect(expectedStartVertex).toBe(firstStartVertex)

    if (surface.type === "PLANE") {
      const placementRef = refsIn(surface.args)[0]!
      const [originRef, axisRef] = refsIn(entities.get(placementRef)!.args)
      const originCoords = entities
        .get(originRef!)!
        .args.match(/-?\d+(?:\.\d+)?(?:E[+-]?\d+)?/gi)!
        .map(Number)
      const normal = directionOf(axisRef!)

      if (Math.abs(normal.z) > 0.9) {
        let signedArea2 = 0
        for (let i = 0; i < loopVertices.length; i++) {
          const current = loopVertices[i]!
          const next = loopVertices[(i + 1) % loopVertices.length]!
          signedArea2 += current.x * next.y - next.x * current.y
        }
        const signedAreaXY = signedArea2 / 2
        if (originCoords[2]! < 0) {
          expect(normal.z).toBe(-1)
          bottomSignedAreaXY = signedAreaXY
        } else {
          expect(normal.z).toBe(1)
          topSignedAreaXY = signedAreaXY
        }
      }
    }
  }

  // Viewed from +Z: top outer loop is CCW (+area), bottom outer loop is CW (-area),
  // which is CCW seen from the bottom plane's (0, 0, -1) outward normal.
  expect(topSignedAreaXY).toBeCloseTo(expectedAreaMm2, 6)
  expect(bottomSignedAreaXY).toBeCloseTo(-expectedAreaMm2, 6)

  for (const [, orientations] of edgeOrientations) {
    expect(orientations).toHaveLength(2)
    expect(orientations[0]).toBe(!orientations[1])
  }
}

test("basics25: bottom board face outer loop winds CCW around its -Z outward normal", async () => {
  const rectStep = await circuitJsonToStep(rectangularBoard as CircuitJson, {
    exportMode: "pcb",
  })
  verifyBoardCapWindingAndShellConsistency(rectStep, 50 * 30)
  expect((await importStepWithOcct(rectStep)).success).toBe(true)

  const lShapeBoard: CircuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_l",
      width: 40,
      height: 30,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
      center: { x: 20, y: 15 },
      outline: [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 15 },
        { x: 20, y: 15 },
        { x: 20, y: 30 },
        { x: 0, y: 30 },
      ],
    },
  ]
  const lShapeStep = await circuitJsonToStep(lShapeBoard, {
    exportMode: "pcb",
  })
  verifyBoardCapWindingAndShellConsistency(lShapeStep, 40 * 15 + 20 * 15)
  expect((await importStepWithOcct(lShapeStep)).success).toBe(true)
})
