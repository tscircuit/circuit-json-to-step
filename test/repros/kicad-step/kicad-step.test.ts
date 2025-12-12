import { test, expect } from "bun:test"
import { fileURLToPath } from "node:url"
import { join } from "node:path"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import type { OcctMesh } from "../../utils/occt/importer"
import { loadStepFilesFromCircuitJson } from "../../utils/load-step-files"
import { parseRepository, ManifoldSolidBrep } from "stepts"
import circuitJson from "./kicad-step.json"

type CadComponentJson = {
  type: string
  position?: { x?: number; y?: number }
  model_step_url?: string
}

const EXPECTED_COMPONENT_CENTERS = (circuitJson as CadComponentJson[])
  .filter((item) => item.type === "cad_component" && item.model_step_url)
  .map((item) => ({
    x: item.position?.x ?? 0,
    y: item.position?.y ?? 0,
  }))

const fixturesDir = fileURLToPath(
  new URL("../../fixtures/kicad-models/", import.meta.url),
)

async function loadStepFixture(name: string) {
  const filePath = join(fixturesDir, name)
  return await Bun.file(filePath).text()
}

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

test("kicad-step: resistor fixture renders consistently", async () => {
  const resistorStep = await loadStepFixture("R_0603_1608Metric.step")
  const result = await importStepWithOcct(resistorStep)

  expect(result.success).toBe(true)
  expect(result.meshes.length).toBeGreaterThan(0)

  await expect(resistorStep).toMatchStepSnapshot(
    import.meta.path,
    "resistor-fixture",
  )
})

test("kicad-step: switch fixture renders consistently", async () => {
  const switchStep = await loadStepFixture("Panasonic_EVQPUJ_EVQPUA.step")
  const result = await importStepWithOcct(switchStep)

  expect(result.success).toBe(true)
  expect(result.meshes.length).toBeGreaterThan(0)

  await expect(switchStep).toMatchStepSnapshot(
    import.meta.path,
    "switch-fixture",
  )
}, 30000)

test("kicad-step: merges KiCad STEP models referenced via model_step_url", async () => {
  const fsMap = await loadStepFilesFromCircuitJson(circuitJson)
  const stepText = await circuitJsonToStep(circuitJson as any, {
    includeComponents: true,
    includeExternalMeshes: true,
    productName: "KiCadStepMerge",
    fsMap,
  })

  expect(stepText).toContain("KiCadStepMerge")
  const solidCount = (stepText.match(/MANIFOLD_SOLID_BREP/g) || []).length
  expect(solidCount).toBeGreaterThanOrEqual(3)

  const repository = parseRepository(stepText)
  const solids = Array.from(repository.entries())
    .map(([, entity]) => entity)
    .filter(
      (entity): entity is ManifoldSolidBrep =>
        entity instanceof ManifoldSolidBrep,
    )
  const boardSolids = solids.filter(
    (entity) => entity.name === "KiCadStepMerge",
  )
  expect(boardSolids.length).toBe(1)
  const componentSolids = solids.length - boardSolids.length
  expect(componentSolids).toBeGreaterThanOrEqual(
    EXPECTED_COMPONENT_CENTERS.length,
  )

  try {
    const occtBoard = await importStepWithOcct(stepText)
    console.log(
      "board occt success",
      occtBoard.success,
      occtBoard.meshes.length,
    )
    expect(occtBoard.success).toBe(true)
    expect(occtBoard.meshes.length).toBeGreaterThanOrEqual(3)

    const boardCandidate = occtBoard.meshes
      .map((mesh) => ({ mesh, bounds: computeBounds(mesh) }))
      .find((entry) => {
        if (!entry.bounds) return false
        const width = entry.bounds.max.x - entry.bounds.min.x
        const height = entry.bounds.max.y - entry.bounds.min.y
        const thickness = entry.bounds.max.z - entry.bounds.min.z
        return (
          Math.abs(width - 16) < 1 &&
          Math.abs(height - 32) < 1 &&
          Math.abs(thickness - 1.6) < 0.3
        )
      })

    expect(boardCandidate).toBeDefined()

    const boardMesh = boardCandidate?.mesh
    const boardBounds = boardCandidate?.bounds ?? null
    expect(boardBounds).not.toBeNull()
    if (boardBounds) {
      expect(boardBounds.max.x - boardBounds.min.x).toBeCloseTo(16, 1)
      expect(boardBounds.max.y - boardBounds.min.y).toBeCloseTo(32, 1)
      expect(boardBounds.max.z - boardBounds.min.z).toBeCloseTo(1.6, 1)
    }

    const componentCandidates = occtBoard.meshes
      .filter((mesh) => mesh !== boardMesh)
      .map((mesh) => {
        const bounds = computeBounds(mesh)
        if (!bounds) return null
        const center = {
          x: (bounds.min.x + bounds.max.x) / 2,
          y: (bounds.min.y + bounds.max.y) / 2,
          z: (bounds.min.z + bounds.max.z) / 2,
        }
        return { mesh, bounds, center }
      })
      .filter(
        (
          entry,
        ): entry is {
          mesh: OcctMesh
          bounds: Bounds
          center: { x: number; y: number; z: number }
        } => entry !== null,
      )

    const usedIndices = new Set<number>()
    const toleranceXY = 3
    const toleranceZ = 2

    for (const expectedCenter of EXPECTED_COMPONENT_CENTERS) {
      const matchIndex = componentCandidates.findIndex((entry, index) => {
        if (usedIndices.has(index)) return false
        return (
          Math.abs(entry.center.x - expectedCenter.x) <= toleranceXY &&
          Math.abs(entry.center.y - expectedCenter.y) <= toleranceXY &&
          Math.abs(entry.center.z - 0.8) <= toleranceZ
        )
      })

      expect(matchIndex).not.toBe(-1)
      if (matchIndex !== -1) {
        usedIndices.add(matchIndex)
      }
    }

    expect(usedIndices.size).toBeGreaterThanOrEqual(
      EXPECTED_COMPONENT_CENTERS.length,
    )
  } catch (error) {
    console.error("board occt failure", error)
    throw error
  }

  await expect(stepText).toMatchStepSnapshot(
    import.meta.path,
    "kicad-step-board",
  )
}, 80000)
