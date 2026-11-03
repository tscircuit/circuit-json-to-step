import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib"
import { expectFaceCoverage } from "../../utils/mesh-coverage"
import { importStepWithOcct } from "../../utils/occt/importer"
import { renderPadHoleSnapshot } from "./render-pad-hole-snapshot"
import fixture from "./basics24.json"

test("basics24: round drill in an oval pad exports as an open STEP hole", async () => {
  const circuitJson = fixture as CircuitJson
  const step = await circuitJsonToStep(circuitJson, { exportMode: "pcb" })
  expect(step.match(/\b(?:NaN|Infinity)\b/g) ?? []).toEqual([])
  const imported = await importStepWithOcct(step)
  expect(imported.meshes).toHaveLength(1)
  const mesh = imported.meshes[0]!
  const geometry = {
    positions: mesh.attributes.position.array,
    indices: mesh.index.array,
    zTop: 0.8,
  }
  const holes = circuitJson.filter(
    (element) => element.type === "pcb_plated_hole",
  )
  expect(holes).toHaveLength(3)
  expectFaceCoverage(
    geometry,
    holes.map((hole): [number, number] => [hole.x, hole.y]),
    false,
  )
  expectFaceCoverage(geometry, [[0, 2]], true)
  expect(
    (await importStepWithOcct(await circuitJsonToStep(circuitJson))).success,
  ).toBe(true)
  await expect(
    await renderPadHoleSnapshot({ stepText: step, stage: "after" }),
  ).toMatchPngSnapshot(import.meta.path, "basics24")
}, 30_000)
