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
import { EXCLUDED_ENTITY_TYPES } from "./step-model-merger/excluded-entity-types"
import {
  asVector3,
  toRadians,
  transformDirection,
  transformPoint,
  rotateVector,
} from "./step-model-merger/vector-utils"
import { readStepFile } from "./step-model-merger/read-step-file"
import type {
  CadComponent,
  PcbComponent,
  MergeStepModelOptions,
  MergeStepModelResult,
  MergeTransform,
} from "./step-model-merger/types"

export type { MergeStepModelOptions, MergeStepModelResult } from "./step-model-merger/types"

export async function mergeExternalStepModels(
  options: MergeStepModelOptions,
): Promise<MergeStepModelResult> {
  const { repo, circuitJson, boardThickness } = options
  const cadComponents = (circuitJson as CadComponent[]).filter(
    (item) =>
      item?.type === "cad_component" && typeof item.model_step_url === "string",
  )

  const pcbComponentMap = new Map<string, PcbComponent>()
  for (const item of circuitJson as (CadComponent | PcbComponent)[]) {
    if (item?.type === "pcb_component" && item.pcb_component_id) {
      pcbComponentMap.set(item.pcb_component_id, item)
    }
  }

  const solids: Ref<ManifoldSolidBrep>[] = []
  const handledComponentIds = new Set<string>()
  const handledPcbComponentIds = new Set<string>()

  for (const component of cadComponents) {
    const componentId = component.cad_component_id ?? ""
    const stepUrl = component.model_step_url!

    try {
      const stepText = await readStepFile(stepUrl)
      if (!stepText.trim()) {
        throw new Error("STEP file is empty")
      }

      const pcbComponent = component.pcb_component_id
        ? pcbComponentMap.get(component.pcb_component_id)
        : undefined
      const layer = pcbComponent?.layer?.toLowerCase()

      const transform: MergeTransform = {
        translation: asVector3(component.position),
        rotation: asVector3(component.rotation),
      }

      const componentSolids = mergeSingleStepModel(repo, stepText, transform, {
        layer,
        boardThickness,
      })
      if (componentSolids.length > 0) {
        if (componentId) {
          handledComponentIds.add(componentId)
        }
        const pcbComponentId = component.pcb_component_id
        if (pcbComponentId) {
          handledPcbComponentIds.add(pcbComponentId)
        }
      }
      solids.push(...componentSolids)
    } catch (error) {
      console.warn(`Failed to merge STEP model from ${stepUrl}:`, error)
    }
  }

  return { solids, handledComponentIds, handledPcbComponentIds }
}

type PlacementOptions = {
  layer?: string
  boardThickness?: number
}

function mergeSingleStepModel(
  targetRepo: Repository,
  stepText: string,
  transform: MergeTransform,
  placement?: PlacementOptions,
): Ref<ManifoldSolidBrep>[] {
  const sourceRepo = parseRepository(stepText)
  let entries: RepositoryEntry[] = sourceRepo
    .entries()
    .map(([id, entity]) => [Number(id), entity] as const)
    .filter(([, entity]) => !EXCLUDED_ENTITY_TYPES.has(entity.type))

  entries = pruneInvalidEntries(entries)

  adjustTransformForPlacement(entries, transform, placement)
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

function adjustTransformForPlacement(
  entries: ReadonlyArray<RepositoryEntry>,
  transform: MergeTransform,
  placement?: PlacementOptions,
) {
  if (!placement) return

  const points: [number, number, number][] = []
  for (const [, entity] of entries) {
    if (entity instanceof CartesianPoint) {
      points.push([entity.x, entity.y, entity.z])
    }
  }

  if (!points.length) return

  const rotationRadians = toRadians(transform.rotation)

  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity

  for (const point of points) {
    const [x, y, z] = rotateVector(point, rotationRadians)
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    if (z > maxZ) maxZ = z
  }

  if (!Number.isFinite(minX)) return

  const center = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: (minZ + maxZ) / 2,
  }

  const normalizedLayer = placement.layer?.toLowerCase() === "bottom" ? "bottom" : "top"
  const boardThickness = placement.boardThickness ?? 0
  const halfThickness = boardThickness / 2

  const targetX = transform.translation.x
  const targetY = transform.translation.y
  const targetZ = transform.translation.z

  transform.translation.x = targetX - center.x
  transform.translation.y = targetY - center.y

  if (boardThickness > 0) {
    const offsetZ = targetZ - halfThickness
    if (normalizedLayer === "bottom") {
      transform.translation.z = -maxZ + offsetZ
      transform.rotation.x = normalizeDegrees(transform.rotation.x + 180)
    } else {
      transform.translation.z = boardThickness - minZ + offsetZ
    }
  } else {
    transform.translation.z = targetZ - center.z
  }
}

function normalizeDegrees(value: number): number {
  const wrapped = value % 360
  return wrapped < 0 ? wrapped + 360 : wrapped
}

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
