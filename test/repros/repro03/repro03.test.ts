import { expect, test } from "bun:test"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./repro03.json"

test("repro03: reproduces fallback boxes for hole wrapper components", async () => {
  const stepText = await circuitJsonToStep(circuitJson as any, {
    includeComponents: true,
    productName: "Repro03",
  })

  expect(stepText).toContain("ISO-10303-21")
  expect(stepText).toContain("END-ISO-10303-21")
  expect(stepText).toContain("Repro03")
  expect(stepText).toContain("CYLINDRICAL_SURFACE")

  // Current repro behavior: these are fallback boxes for wrapper components,
  // not intended physical component models.
  expect(stepText).toContain("Xpattern1")
  expect(stepText).toContain("Xpattern4")

  const outputPath = "debug-output/repro03.step"
  await Bun.write(outputPath, stepText)

  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)
  expect(occtResult.meshes.length).toBeGreaterThan(0)

  await expect(stepText).toMatchStepSnapshot(import.meta.path, "repro03")
})
