import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { tokenizeSTEP } from "stepts"
import { circuitJsonToStep } from "../../../lib/index"
import {
  normalizeStepEntityTerminators,
  normalizeStepNumericExponents,
} from "../../../lib/step-text-utils"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./basics22.json"

test("basics22: imported SolidWorks STEP accepts whitespace before semicolons", async () => {
  const geometry = await Bun.file(
    new URL("./solidworks.step", import.meta.url),
  ).text()
  const step = await circuitJsonToStep(circuitJson as CircuitJson, {
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
  expect(normalizeStepNumericExponents("VECTOR('',#1,1e-10);")).toBe(
    "VECTOR('',#1,1.E-10);",
  )
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
  const pcb = await circuitJsonToStep(circuitJson as CircuitJson, {
    exportMode: "pcb",
    includeComponents: true,
    includeExternalMeshes: true,
    fsMap: { "./solidworks.step": geometry },
  })
  expect((await importStepWithOcct(pcb)).meshes).toHaveLength(2)
  expect(
    normalizeStepEntityTerminators(
      "#1 = PRODUCT('keep) ;it''s intact', 'x', '', (#2)) ; /* keep) ; */",
    ),
  ).toBe("#1 = PRODUCT('keep) ;it''s intact', 'x', '', (#2)); /* keep) ; */")
})
