import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { tokenizeSTEP } from "stepts"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics22.json"

test("basics22: SolidWorks-format STEP preserves UV geometry and numeric-looking names", async () => {
  const geometry = await Bun.file(
    new URL("./solidworks.step", import.meta.url),
  ).text()
  const step = await circuitJsonToStep(circuitJson as CircuitJson, {
    productName: "sensor1e-10",
    fsMap: { "./solidworks.step": geometry },
  })
  const imported = await importStepWithOcct(step)
  const entities = tokenizeSTEP(step)
  const uvPoint = entities.find((entity) => entity.args[0] === "'UVpoint'")
  expect(uvPoint?.args[1]).toBe("(0.,1.)")
  const uvDirection = entities.find(
    (entity) => entity.args[0] === "'UVdirection'",
  )
  expect(uvDirection?.args[1]).toBe("(0.,1.)")
  const spline = entities.find(
    (entity) => entity.type === "B_SPLINE_CURVE_WITH_KNOTS",
  )
  expect(spline?.args[6]).toBe("(2,2)")
  expect(spline?.args[5]).toBe(".U.")
  const product = entities.find(
    (entity) => entity.type === "PRODUCT" && entity.args[0] === "'sensor1e-10'",
  )
  expect(product).toBeDefined()
  expect(imported.root.children[0].children.map((child) => child.name)).toEqual(
    ["PCB", "CONNECTOR"],
  )
  const connector = imported.meshes[1]
  for (const [axis, min, max] of [
    [0, 4, 6],
    [1, 0, 4],
    [2, 0, 6],
  ]) {
    const values = connector.attributes.position.array.filter(
      (_, i) => i % 3 === axis,
    )
    expect(Math.min(...values)).toBeCloseTo(min)
    expect(Math.max(...values)).toBeCloseTo(max)
  }
  await expect(step).toMatchStepSnapshot(
    import.meta.path,
    "solidworks-assembly",
  )
  const pcb = await circuitJsonToStep(circuitJson as CircuitJson, {
    productName: "sensor1e-10",
    exportMode: "pcb",
    includeComponents: true,
    includeExternalMeshes: true,
    fsMap: { "./solidworks.step": geometry },
  })
  expect((await importStepWithOcct(pcb)).meshes).toHaveLength(2)
  await expect(pcb).toMatchStepSnapshot(import.meta.path, "solidworks-pcb")
  expect(pcb).toContain("PRODUCT('sensor1e-10'")
})
