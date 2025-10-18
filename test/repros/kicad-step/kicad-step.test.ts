import { test, expect } from "bun:test"
import { fileURLToPath } from "node:url"
import { join } from "node:path"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./kicad-step.json"

const fixturesDir = fileURLToPath(new URL("../../fixtures/kicad-models/", import.meta.url))

async function loadStepFixture(name: string) {
  const filePath = join(fixturesDir, name)
  return await Bun.file(filePath).text()
}

test("kicad-step: resistor fixture renders consistently", async () => {
  const resistorStep = await loadStepFixture("R_0603_1608Metric.step")
  const result = await importStepWithOcct(resistorStep)

  expect(result.success).toBe(true)
  expect(result.meshes.length).toBeGreaterThan(0)

  await expect(resistorStep).toMatchStepSnapshot(import.meta.path, "resistor-fixture")
})

test("kicad-step: switch fixture renders consistently", async () => {
  const switchStep = await loadStepFixture("Panasonic_EVQPUJ_EVQPUA.step")
  const result = await importStepWithOcct(switchStep)

  expect(result.success).toBe(true)
  expect(result.meshes.length).toBeGreaterThan(0)

  await expect(switchStep).toMatchStepSnapshot(import.meta.path, "switch-fixture")
}, 30000)

test(
  "kicad-step: merges KiCad STEP models referenced via model_step_url",
  async () => {
    const stepText = await circuitJsonToStep(circuitJson as any, {
      includeComponents: true,
      includeExternalMeshes: true,
      productName: "KiCadStepMerge",
    })

    expect(stepText).toContain("KiCadStepMerge")
    const solidCount = (stepText.match(/MANIFOLD_SOLID_BREP/g) || []).length
    expect(solidCount).toBeGreaterThanOrEqual(3)

    try {
      const occtBoard = await importStepWithOcct(stepText)
      console.log("board occt success", occtBoard.success, occtBoard.meshes.length)
    } catch (error) {
      console.error("board occt failure", error)
      throw error
    }

    await expect(stepText).toMatchStepSnapshot(import.meta.path, "kicad-step-board")
  },
  80000,
)
