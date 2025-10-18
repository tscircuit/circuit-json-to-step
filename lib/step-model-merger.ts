import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { CircuitJson } from "circuit-json"
import {
  CartesianPoint,
  Direction,
  ManifoldSolidBrep,
  Ref,
  Repository,
  Unknown,
  parseRepository,
} from "stepts"
import { eid } from "stepts/lib/core/EntityId"

const EXCLUDED_ENTITY_TYPES = new Set<string>([
  "APPLICATION_CONTEXT",
  "APPLICATION_PROTOCOL_DEFINITION",
  "PRODUCT",
  "PRODUCT_CONTEXT",
  "PRODUCT_DEFINITION",
  "PRODUCT_DEFINITION_FORMATION",
  "PRODUCT_DEFINITION_CONTEXT",
  "PRODUCT_DEFINITION_SHAPE",
  "SHAPE_DEFINITION_REPRESENTATION",
  "ADVANCED_BREP_SHAPE_REPRESENTATION",
  "MECHANICAL_DESIGN_GEOMETRIC_PRESENTATION_REPRESENTATION",
  "PRESENTATION_STYLE_ASSIGNMENT",
  "SURFACE_STYLE_USAGE",
  "SURFACE_SIDE_STYLE",
  "SURFACE_STYLE_FILL_AREA",
  "FILL_AREA_STYLE",
  "FILL_AREA_STYLE_COLOUR",
  "COLOUR_RGB",
  "STYLED_ITEM",
  "CURVE_STYLE",
  "DRAUGHTING_PRE_DEFINED_CURVE_FONT",
  "PRODUCT_RELATED_PRODUCT_CATEGORY",
  "NEXT_ASSEMBLY_USAGE_OCCURRENCE",
  "CONTEXT_DEPENDENT_SHAPE_REPRESENTATION",
  "ITEM_DEFINED_TRANSFORMATION",
])

type CadComponent = {
  type: "cad_component"
  cad_component_id?: string
  model_step_url?: string
  position?: { x?: number; y?: number; z?: number }
  rotation?: { x?: number; y?: number; z?: number }
}

type Vector3 = { x: number; y: number; z: number }

type MergeTransform = {
  translation: Vector3
  rotation: Vector3
}

type MergeStepModelResult = {
  solids: Ref<ManifoldSolidBrep>[]
  handledComponentIds: Set<string>
}

export interface MergeStepModelOptions {
  repo: Repository
  circuitJson: CircuitJson
}

export async function mergeExternalStepModels(
  options: MergeStepModelOptions,
): Promise<MergeStepModelResult> {
  const { repo, circuitJson } = options
  const cadComponents = (circuitJson as CadComponent[]).filter(
    (item) =>
      item?.type === "cad_component" && typeof item.model_step_url === "string",
  )

  const solids: Ref<ManifoldSolidBrep>[] = []
  const handledComponentIds = new Set<string>()

  for (const component of cadComponents) {
    const componentId = component.cad_component_id ?? ""
    const stepUrl = component.model_step_url!

    try {
      const stepText = await readStepFile(stepUrl)
      if (!stepText.trim()) {
        throw new Error("STEP file is empty")
      }

      const transform: MergeTransform = {
        translation: asVector3(component.position),
        rotation: asVector3(component.rotation),
      }

      const componentSolids = mergeSingleStepModel(repo, stepText, transform)
      if (componentSolids.length > 0 && componentId) {
        handledComponentIds.add(componentId)
      }
      solids.push(...componentSolids)
    } catch (error) {
      console.warn(`Failed to merge STEP model from ${stepUrl}:`, error)
    }
  }

  return { solids, handledComponentIds }
}

function asVector3(value?: Partial<Vector3>): Vector3 {
  return {
    x: value?.x ?? 0,
    y: value?.y ?? 0,
    z: value?.z ?? 0,
  }
}

async function readStepFile(modelUrl: string): Promise<string> {
  if (/^https?:\/\//i.test(modelUrl)) {
    const globalFetch = (globalThis as any).fetch as
      | ((input: string, init?: unknown) => Promise<any>)
      | undefined
    if (!globalFetch) {
      throw new Error("fetch is not available in this environment")
    }
    const res = await globalFetch(modelUrl)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`)
    }
    return await res.text()
  }

  if (modelUrl.startsWith("file://")) {
    const filePath = fileURLToPath(modelUrl)
    return await fs.readFile(filePath, "utf8")
  }

  const resolvedPath = path.isAbsolute(modelUrl)
    ? modelUrl
    : path.resolve(process.cwd(), modelUrl)
  return await fs.readFile(resolvedPath, "utf8")
}

function mergeSingleStepModel(
  targetRepo: Repository,
  stepText: string,
  transform: MergeTransform,
): Ref<ManifoldSolidBrep>[] {
  const sourceRepo = parseRepository(stepText)
  let entries: RepositoryEntry[] = sourceRepo
    .entries()
    .map(([id, entity]) => [Number(id), entity] as const)
    .filter(([, entity]) => !EXCLUDED_ENTITY_TYPES.has(entity.type))

  entries = pruneInvalidEntries(entries)

  applyTransform(entries, transform)

  const idMapping = allocateIds(targetRepo, entries)
  remapReferences(entries, idMapping)

  for (const [oldId, entity] of entries) {
    const mappedId = idMapping.get(oldId)
    if (mappedId === undefined) continue
    targetRepo.set(eid(mappedId), entity)
  }

  const solids: Ref<ManifoldSolidBrep>[] = []
  for (const [oldId, entity] of entries) {
    if (entity instanceof ManifoldSolidBrep) {
      const mappedId = idMapping.get(oldId)
      if (mappedId !== undefined) {
        solids.push(new Ref<ManifoldSolidBrep>(eid(mappedId)))
      }
    }
  }

  return solids
}

type RepositoryEntry = readonly [number, any]

function pruneInvalidEntries(entries: ReadonlyArray<RepositoryEntry>) {
  let remaining = entries.slice()
  let remainingIds = new Set(remaining.map(([id]) => id))

  let changed = true
  while (changed) {
    changed = false
    const toRemove = new Set<number>()

    for (const [entityId, entity] of remaining) {
      const refs = collectReferencedIds(entity)
      for (const refId of refs) {
        if (!remainingIds.has(refId)) {
          toRemove.add(entityId)
          break
        }
      }
    }

    if (toRemove.size > 0) {
      changed = true
      remaining = remaining.filter(([id]) => !toRemove.has(id))
      remainingIds = new Set(remaining.map(([id]) => id))
    }
  }

  return remaining
}

function collectReferencedIds(entity: unknown): Set<number> {
  const result = new Set<number>()
  collectReferencedIdsRecursive(entity, result, new Set())
  return result
}

function collectReferencedIdsRecursive(
  value: unknown,
  result: Set<number>,
  seen: Set<object>,
) {
  if (!value) return

  if (value instanceof Ref) {
    result.add(Number(value.id))
    return
  }

  if (value instanceof Unknown) {
    for (const arg of value.args) {
      arg.replace(/#(\d+)/g, (_, num) => {
        result.add(Number(num))
        return _
      })
    }
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectReferencedIdsRecursive(item, result, seen)
    }
    return
  }

  if (typeof value === "object") {
    if (seen.has(value as object)) {
      return
    }
    seen.add(value as object)
    for (const entry of Object.values(value as Record<string, unknown>)) {
      collectReferencedIdsRecursive(entry, result, seen)
    }
  }
}

function applyTransform(
  entries: ReadonlyArray<RepositoryEntry>,
  transform: MergeTransform,
) {
  const rotation = toRadians(transform.rotation)

  for (const [, entity] of entries) {
    if (entity instanceof CartesianPoint) {
      const [x, y, z] = transformPoint(
        [entity.x, entity.y, entity.z],
        rotation,
        transform.translation,
      )
      entity.x = x
      entity.y = y
      entity.z = z
    } else if (entity instanceof Direction) {
      const [dx, dy, dz] = transformDirection(
        [entity.dx, entity.dy, entity.dz],
        rotation,
      )
      const length = Math.hypot(dx, dy, dz)
      if (length > 0) {
        entity.dx = dx / length
        entity.dy = dy / length
        entity.dz = dz / length
      }
    }
  }
}

function toRadians(rotation: Vector3): Vector3 {
  const factor = Math.PI / 180
  return {
    x: rotation.x * factor,
    y: rotation.y * factor,
    z: rotation.z * factor,
  }
}

function transformPoint(
  point: [number, number, number],
  rotation: Vector3,
  translation: Vector3,
): [number, number, number] {
  const rotated = rotateVector(point, rotation)
  return [
    rotated[0] + translation.x,
    rotated[1] + translation.y,
    rotated[2] + translation.z,
  ]
}

function transformDirection(
  vector: [number, number, number],
  rotation: Vector3,
): [number, number, number] {
  return rotateVector(vector, rotation)
}

function rotateVector(
  vector: [number, number, number],
  rotation: Vector3,
): [number, number, number] {
  let [x, y, z] = vector

  if (rotation.x !== 0) {
    const cosX = Math.cos(rotation.x)
    const sinX = Math.sin(rotation.x)
    const y1 = y * cosX - z * sinX
    const z1 = y * sinX + z * cosX
    y = y1
    z = z1
  }

  if (rotation.y !== 0) {
    const cosY = Math.cos(rotation.y)
    const sinY = Math.sin(rotation.y)
    const x1 = x * cosY + z * sinY
    const z1 = -x * sinY + z * cosY
    x = x1
    z = z1
  }

  if (rotation.z !== 0) {
    const cosZ = Math.cos(rotation.z)
    const sinZ = Math.sin(rotation.z)
    const x1 = x * cosZ - y * sinZ
    const y1 = x * sinZ + y * cosZ
    x = x1
    y = y1
  }

  return [x, y, z]
}

function allocateIds(
  targetRepo: Repository,
  entries: ReadonlyArray<RepositoryEntry>,
): Map<number, number> {
  let nextId = getNextEntityId(targetRepo)
  const idMapping = new Map<number, number>()

  for (const [oldId] of entries) {
    idMapping.set(oldId, nextId)
    nextId += 1
  }

  return idMapping
}

function getNextEntityId(repo: Repository): number {
  let maxId = 0
  for (const [id] of repo.entries()) {
    const numericId = Number(id)
    if (numericId > maxId) {
      maxId = numericId
    }
  }
  return maxId + 1
}

function remapReferences(
  entries: ReadonlyArray<RepositoryEntry>,
  idMapping: Map<number, number>,
) {
  for (const [, entity] of entries) {
    remapValue(entity, idMapping, new Set())
  }
}

function remapValue(
  value: unknown,
  idMapping: Map<number, number>,
  seen: Set<object>,
) {
  if (!value) return

  if (value instanceof Ref) {
    const mapped = idMapping.get(Number(value.id))
    if (mapped !== undefined) {
      value.id = eid(mapped)
    }
    return
  }

  if (value instanceof Unknown) {
    value.args = value.args.map((arg) =>
      arg.replace(/#(\d+)/g, (match, num) => {
        const mapped = idMapping.get(Number(num))
        return mapped !== undefined ? `#${mapped}` : match
      }),
    )
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      remapValue(item, idMapping, seen)
    }
    return
  }

  if (typeof value === "object") {
    if (seen.has(value as object)) return
    seen.add(value as object)
    for (const key of Object.keys(value as Record<string, unknown>)) {
      remapValue((value as Record<string, unknown>)[key], idMapping, seen)
    }
  }
}
