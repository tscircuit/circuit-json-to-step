import { expect, test } from "bun:test"
import { jscadToStep } from "jscad-to-step"
import { CartesianPoint, eid, parseRepository } from "stepts"
import { importStepModelGeometry } from "../lib/step-model-merger"

test("imported models preserve existing entities and use distinct IDs in a sparse repository", () => {
  const geometry = jscadToStep({ type: "cuboid", size: [2, 3, 4] })
  const repo = parseRepository(geometry)
  const sentinelId = eid(1_000_000)
  const sentinel = new CartesianPoint("existing point", 10, 20, 30)
  repo.set(sentinelId, sentinel)
  const existing = repo.entries()

  const first = importStepModelGeometry(repo, geometry, "first")
  const second = importStepModelGeometry(repo, geometry, "second")
  for (const [id, entity] of existing) expect(repo.get(id)).toBe(entity)
  expect(repo.get(sentinelId)).toBe(sentinel)
  expect(first.solids).toHaveLength(1)
  expect(second.solids).toHaveLength(1)
  expect(Number(first.solids[0]!.id)).toBeGreaterThan(Number(sentinelId))
  expect(Number(second.solids[0]!.id)).toBeGreaterThan(
    Number(first.representation.id),
  )
  expect(first.solids[0]!.resolve(repo).type).toBe("MANIFOLD_SOLID_BREP")
  expect(second.solids[0]!.resolve(repo).type).toBe("MANIFOLD_SOLID_BREP")
  const emitted = parseRepository(repo.toPartFile({ name: "sparse imports" }))
  expect(emitted.entries()).toHaveLength(repo.entries().length)
  expect(first.solids[0]!.resolve(emitted).type).toBe("MANIFOLD_SOLID_BREP")
  expect(second.solids[0]!.resolve(emitted).type).toBe("MANIFOLD_SOLID_BREP")
})
