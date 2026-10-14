// Fixtures:
//   cutout-polygon.json - slice of dataset-srj24/sample023 (real TI board, 3 polygon
//     cutouts, 20-point outline). Guards: cutouts are emitted as removed material
//     through the board solid, not ignored and not floated beside it. Volume is
//     derived from board outline area minus cutout area.
//   cutout-circle-and-rect.json - circle cutouts as emitted by an @tscircuit/core
//     render of <cutout shape="circle">, and rounded-rect cutouts as emitted by
//     core's panelizer (generatePanelTabsAndMouseBites), including one rotated
//     90deg. Guards: the stadium collapse (corner_radius == height/2), rect
//     rotation, and per-shape removal. Only the bounding pcb_board is synthetic;
//     every pcb_cutout is producer output.
//
// Material presence is asserted with ray-cast coverage rather than a
// divergence-volume integral. occt can wind the tessellation of a face carrying
// multiple inner bounds differently for files that are otherwise value- and
// graph-identical, which changes the divergence volume but not the solid.
import { test, expect } from "bun:test"
import { parseRepository } from "stepts"
import { circuitJsonToStep } from "../lib/index"
import { importStepWithOcct } from "./utils/occt/importer"
import "./fixtures/step-snapshot"
import cutoutPolygon from "./fixtures/cutout-polygon.json"
import cutoutCircleAndRect from "./fixtures/cutout-circle-and-rect.json"

type CircuitElement = { type: string; [key: string]: unknown }

const elements = cutoutPolygon as CircuitElement[]
const board = elements.find(
  (element) => element.type === "pcb_board",
) as unknown as {
  outline: { x: number; y: number }[]
  thickness: number
}
const cutouts = elements.filter(
  (element) => element.type === "pcb_cutout",
) as unknown as {
  points: { x: number; y: number }[]
}[]

function countOccurrences(text: string, token: string): number {
  return text.split(token).length - 1
}

function getLoopBreakCounts(stepText: string): number[] {
  const repo = parseRepository(stepText)
  const breakCounts: number[] = []

  for (const [, entity] of repo.entries()) {
    if (entity.type !== "EDGE_LOOP") continue
    const loop = entity as unknown as {
      edges: {
        resolve: (repo: unknown) => {
          orientation: boolean
          edge: {
            resolve: (repo: unknown) => {
              start: { resolve: (repo: unknown) => unknown }
              end: { resolve: (repo: unknown) => unknown }
            }
          }
        }
      }[]
    }
    const orientedEdges = loop.edges.map((edge) => edge.resolve(repo))
    let breaks = 0
    for (let index = 0; index < orientedEdges.length; index++) {
      const current = orientedEdges[index]!
      const next = orientedEdges[(index + 1) % orientedEdges.length]!
      const currentEdge = current.edge.resolve(repo)
      const nextEdge = next.edge.resolve(repo)
      const currentEnd = (
        current.orientation ? currentEdge.end : currentEdge.start
      ).resolve(repo)
      const nextStart = (
        next.orientation ? nextEdge.start : nextEdge.end
      ).resolve(repo)
      if (currentEnd !== nextStart) breaks++
    }
    breakCounts.push(breaks)
  }

  return breakCounts
}

function getMeshVolume(positions: number[], indices: number[]): number {
  let volume = 0
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i]! * 3
    const b = indices[i + 1]! * 3
    const c = indices[i + 2]! * 3
    volume +=
      (positions[a]! *
        (positions[b + 1]! * positions[c + 2]! -
          positions[b + 2]! * positions[c + 1]!) -
        positions[a + 1]! *
          (positions[b]! * positions[c + 2]! -
            positions[b + 2]! * positions[c]!) +
        positions[a + 2]! *
          (positions[b]! * positions[c + 1]! -
            positions[b + 1]! * positions[c]!)) /
      6
  }
  return volume
}

function polygonArea(points: { x: number; y: number }[]): number {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i]!.x * points[j]!.y - points[j]!.x * points[i]!.y
  }
  return Math.abs(area / 2)
}

function uniquePointCount(points: { x: number; y: number }[]): number {
  let count = 0
  for (let i = 0; i < points.length; i++) {
    const previous = points[(i + points.length - 1) % points.length]!
    if (points[i]!.x !== previous.x || points[i]!.y !== previous.y) count++
  }
  return count
}

function getAxisExtents(
  positions: number[],
  axis: number,
): { min: number; max: number } {
  let lowest = Infinity
  let highest = -Infinity
  for (let index = axis; index < positions.length; index += 3) {
    const value = positions[index]!
    lowest = Math.min(lowest, value)
    highest = Math.max(highest, value)
  }
  return { min: lowest, max: highest }
}

const CIRCLE_CUTOUT_SEGMENTS = 24

type CutoutElement = {
  pcb_cutout_id: string
  shape: string
  radius?: number
  width?: number
  height?: number
  corner_radius?: number
  rotation?: number
  center?: { x: number; y: number }
  points?: { x: number; y: number }[]
}

function rotateProbe(
  x: number,
  y: number,
  degrees: number,
): { x: number; y: number } {
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return { x: x * cos - y * sin, y: x * sin + y * cos }
}

function probePoints(cutout: CutoutElement): { x: number; y: number }[] {
  const rotation = cutout.rotation ?? 0
  const toWorld = (x: number, y: number) => {
    const rotated = rotateProbe(x, y, rotation)
    return {
      x: cutout.center!.x + rotated.x,
      y: cutout.center!.y + rotated.y,
    }
  }

  if (cutout.shape === "circle") {
    const r = cutout.radius! * 0.35
    return [
      [0, 0],
      [r, r * 0.6],
      [-r, r * 0.6],
      [r, -r * 0.6],
      [-r, -r * 0.6],
    ].map(([x, y]) => toWorld(x!, y!))
  }

  if (cutout.shape === "rect") {
    const along = cutout.width! * 0.3
    const across = cutout.height! * 0.28
    return [
      [0, 0],
      [along, across],
      [-along, across],
      [along, -across],
      [-along, -across],
    ].map(([x, y]) => toWorld(x!, y!))
  }

  const points = cutout.points!
  const centroid = {
    x: points.reduce((total, point) => total + point.x, 0) / points.length,
    y: points.reduce((total, point) => total + point.y, 0) / points.length,
  }
  return [
    centroid,
    ...points.map((point) => ({
      x: centroid.x + (point.x - centroid.x) * 0.6,
      y: centroid.y + (point.y - centroid.y) * 0.6,
    })),
  ]
}

test("cutout-polygon: cuts polygon cutouts out of a real 20-point board outline", async () => {
  const expectedSideFaces = uniquePointCount(board.outline)
  const expectedWallFaces = cutouts.reduce(
    (total, cutout) => total + uniquePointCount(cutout.points),
    0,
  )
  const expectedFaces = 2 + expectedSideFaces + expectedWallFaces

  const stepText = await circuitJsonToStep(cutoutPolygon as any, {
    exportMode: "pcb",
    productName: "CutoutPolygon",
  })

  expect(stepText).toContain("ISO-10303-21")
  expect(stepText).toContain("END-ISO-10303-21")
  expect(stepText).toContain("CutoutPolygon")
  expect(countOccurrences(stepText, "MANIFOLD_SOLID_BREP")).toBe(1)
  expect(countOccurrences(stepText, "CLOSED_SHELL")).toBe(1)
  expect(countOccurrences(stepText, "ADVANCED_FACE")).toBe(expectedFaces)
  expect(countOccurrences(stepText, "FACE_BOUND(")).toBe(cutouts.length * 2)
  expect(getLoopBreakCounts(stepText).filter((count) => count > 0)).toEqual([])

  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)
  expect(occtResult.meshes.length).toBe(1)
  expect(occtResult.meshes[0]!.brep_faces.length).toBe(expectedFaces)

  const boardArea = polygonArea(board.outline)
  const cutoutArea = cutouts.reduce(
    (total, cutout) => total + polygonArea(cutout.points),
    0,
  )
  expect(cutoutArea).toBeGreaterThan(0)
  expect(cutoutArea).toBeLessThan(boardArea)
  expect((boardArea - cutoutArea) * board.thickness).toBeCloseTo(
    566.1029634967914,
    4,
  )

  const mesh = occtResult.meshes[0]!
  const positions = mesh.attributes.position.array
  const volume = getMeshVolume(positions, mesh.index.array)
  expect(volume).toBeCloseTo((boardArea - cutoutArea) * board.thickness, 4)

  const extents = [0, 1, 2].map((axis) => getAxisExtents(positions, axis))
  expect(extents[0]!.min).toBeCloseTo(17.5264, 4)
  expect(extents[0]!.max).toBeCloseTo(47.9272, 4)
  expect(extents[1]!.min).toBeCloseTo(38.5132, 4)
  expect(extents[1]!.max).toBeCloseTo(59.414, 4)
  expect(extents[2]!.min).toBeCloseTo(-0.8, 4)
  expect(extents[2]!.max).toBeCloseTo(0.8, 4)

  await expect(stepText).toMatchStepSnapshot(import.meta.path, "cutout")
}, 20000)

test("cutout-circle-and-rect: circle and panel-tab cutouts remove material", async () => {
  const elements = cutoutCircleAndRect as CircuitElement[]
  const boardElement = elements.find(
    (element) => element.type === "pcb_board",
  ) as unknown as {
    width: number
    height: number
    thickness: number
  }
  const cutoutElements = elements.filter(
    (element) => element.type === "pcb_cutout",
  ) as unknown as CutoutElement[]

  const cutoutArea = (cutout: (typeof cutoutElements)[number]) =>
    cutout.shape === "circle"
      ? Math.PI * cutout.radius! * cutout.radius!
      : (cutout.width! - cutout.height!) * cutout.height! +
        Math.PI * cutout.corner_radius! * cutout.corner_radius!

  const boardVolume =
    boardElement.width * boardElement.height * boardElement.thickness

  expect(cutoutElements.length).toBe(4)
  expect(
    cutoutElements.filter((cutout) => cutout.shape === "circle").length,
  ).toBe(2)
  expect(
    cutoutElements.filter(
      (cutout) => cutout.shape === "rect" && cutout.corner_radius! > 0,
    ).length,
  ).toBe(2)
  for (const cutout of cutoutElements) {
    const stepText = await circuitJsonToStep([boardElement, cutout] as any, {
      exportMode: "pcb",
    })
    expect(getLoopBreakCounts(stepText).filter((c) => c > 0)).toEqual([])

    const occtResult = await importStepWithOcct(stepText)
    expect(occtResult.success).toBe(true)
    const mesh = occtResult.meshes[0]!
    const removed =
      boardVolume -
      getMeshVolume(mesh.attributes.position.array, mesh.index.array)

    // Curved walls are tessellated, so removal is bounded below by the
    // analytic volume and must never exceed it.
    const exact = cutoutArea(cutout) * boardElement.thickness
    expect(removed).toBeGreaterThan(exact * 0.4)
    expect(removed).toBeLessThanOrEqual(exact)
  }

  const combined = await circuitJsonToStep(elements as any, {
    exportMode: "pcb",
    productName: "CutoutShapes",
  })
  expect(countOccurrences(combined, "MANIFOLD_SOLID_BREP")).toBe(1)
  expect(countOccurrences(combined, "FACE_BOUND(")).toBe(8)
  expect(getLoopBreakCounts(combined).filter((count) => count > 0)).toEqual([])

  // 6 board faces (top, bottom, 4 sides) + 1 wall per circle cutout
  // + 4 walls per stadium tab (2 straight runs + 2 half-circle ends).
  // 6 board faces (top, bottom, 4 sides) + CIRCLE_CUTOUT_SEGMENTS wall faces
  // per circle cutout + 4 walls per stadium tab (2 straight runs + 2
  // half-circle ends). A circular cutout is built from arc segments rather
  // than one closed CIRCLE edge so that occt meshes the opening faithfully.
  const circleWalls =
    cutoutElements.filter((cutout) => cutout.shape === "circle").length *
    CIRCLE_CUTOUT_SEGMENTS
  const stadiumWalls =
    cutoutElements.filter((cutout) => cutout.shape === "rect").length * 4
  const advancedFaces = countOccurrences(combined, "ADVANCED_FACE")
  expect(advancedFaces).toBe(6 + circleWalls + stadiumWalls)

  // Fine tessellation for the coverage probe: occt's default deflection
  // renders a small cylindrical cutout with wall triangles that fan across
  // the opening, so the coarse mesh does not faithfully represent the hole
  // (it is also why its divergence volume is unreliable). The STEP topology is
  // exact; only the mesh needs refining.
  const occtCombined = await importStepWithOcct(combined, {
    linearUnit: "millimeter",
    linearDeflectionType: "absolute_value",
    linearDeflection: 0.01,
    angularDeflection: 0.05,
  })
  expect(occtCombined.success).toBe(true)
  const mesh = occtCombined.meshes[0]!
  expect(mesh.brep_faces.length).toBe(advancedFaces)

  // Material presence is checked by casting a vertical ray at probe points
  // rather than by integrating a volume. The divergence integral depends on
  // triangle winding, and occt's tessellator winds the mesh differently for
  // files that are otherwise value- and graph-identical: the same solid yields
  // different divergence volumes but identical ray-cast results. A ray crossing
  // count of zero means the ray passes through empty space (a cutout); any
  // non-zero count means it entered and exited material.
  const positions = mesh.attributes.position.array
  const indices = mesh.index.array

  const countCrossings = (x: number, y: number): number => {
    let crossings = 0
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i]! * 3
      const b = indices[i + 1]! * 3
      const c = indices[i + 2]! * 3
      const ax = positions[a]!,
        ay = positions[a + 1]!,
        az = positions[a + 2]!
      const bx = positions[b]!,
        by = positions[b + 1]!,
        bz = positions[b + 2]!
      const cx = positions[c]!,
        cy = positions[c + 1]!,
        cz = positions[c + 2]!
      const e1x = bx - ax,
        e1y = by - ay,
        e1z = bz - az
      const e2x = cx - ax,
        e2y = cy - ay,
        e2z = cz - az
      // pvec = direction x e2 with direction (0, 0, -1) => (e2y, -e2x, 0)
      const hx = e2y,
        hy = -e2x,
        hz = 0
      const det = e1x * hx + e1y * hy + e1z * hz
      if (Math.abs(det) < 1e-12) continue
      const invDet = 1 / det
      const sx = x - ax,
        sy = y - ay,
        sz = 10 - az
      const u = (sx * hx + sy * hy + sz * hz) * invDet
      if (u < 0 || u > 1) continue
      const qx = sy * e1z - sz * e1y
      const qy = sz * e1x - sx * e1z
      const qz = sx * e1y - sy * e1x
      const v = -qz * invDet
      if (v < 0 || u + v > 1) continue
      const t = (e2x * qx + e2y * qy + e2z * qz) * invDet
      if (t > 0) crossings++
    }
    return crossings
  }

  for (const cutout of cutoutElements) {
    const probes = probePoints(cutout)
    for (const probe of probes) {
      expect({
        cutout: cutout.pcb_cutout_id,
        ...probe,
        crossings: countCrossings(probe.x, probe.y),
      }).toEqual({ cutout: cutout.pcb_cutout_id, ...probe, crossings: 0 })
    }
  }

  for (const probe of [
    { x: -25, y: 3 },
    { x: -15, y: 3 },
    { x: -5, y: 3 },
    { x: 3, y: 3 },
    { x: -26, y: -3 },
    { x: -12, y: -3 },
    { x: 3, y: -3 },
  ]) {
    expect(countCrossings(probe.x, probe.y)).toBeGreaterThan(0)
  }
}, 20000)
