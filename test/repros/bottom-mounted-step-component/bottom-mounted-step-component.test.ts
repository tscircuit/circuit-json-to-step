import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { jscadToStep } from "jscad-to-step"
import { circuitJsonToStep } from "../../../lib"
import { importStepWithOcct, type OcctMesh } from "../../utils/occt/importer"
import circuitJson from "./bottom-mounted-step-component.json"

// Fixture generated with @tscircuit/core@0.0.2165 (schematic disabled) from:
// <board width={24} height={16} thickness={1.6} routingDisabled>
//   <chip name="U1" footprint="soic8" layer="bottom"
//     cadModel={{ stepUrl: "./body.step" }} />
// </board>

function assertBounds(mesh: OcctMesh, bounds: number[][]) {
  for (const [axis, [min, max]] of bounds.entries()) {
    const coordinates = mesh.attributes.position.array.filter(
      (_, index) => index % 3 === axis,
    )
    expect(Math.min(...coordinates)).toBeCloseTo(min)
    expect(Math.max(...coordinates)).toBeCloseTo(max)
  }
}

test("repro: bottom-mounted STEP component sits below the PCB", async () => {
  const body = jscadToStep({
    type: "colorize",
    color: [1, 0.4, 0],
    shape: {
      type: "translate",
      vector: [0, 0, 1.5],
      shape: { type: "cuboid", size: [8, 6, 3] },
    },
  })
  const step = await circuitJsonToStep(circuitJson as CircuitJson, {
    fsMap: { "./body.step": body },
  })
  const imported = await importStepWithOcct(step)
  expect(imported.success).toBe(true)
  expect(imported.meshes.map((mesh) => mesh.name)).toEqual(["PCB", "U1"])

  const [pcb, u1] = imported.meshes
  assertBounds(pcb!, [
    [-12, 12],
    [-8, 8],
    [-0.8, 0.8],
  ])
  assertBounds(u1!, [
    [-4, 4],
    [-3, 3],
    [-3.8, -0.8],
  ])

  const pcbStep = await circuitJsonToStep(circuitJson as CircuitJson, {
    exportMode: "pcb",
    includeComponents: true,
    includeExternalMeshes: true,
    fsMap: { "./body.step": body },
  })
  const importedPcb = await importStepWithOcct(pcbStep)
  expect(importedPcb.success).toBe(true)
  expect(importedPcb.meshes).toHaveLength(2)
  assertBounds(importedPcb.meshes[0]!, [
    [-12, 12],
    [-8, 8],
    [-0.8, 0.8],
  ])
  assertBounds(importedPcb.meshes[1]!, [
    [-4, 4],
    [-3, 3],
    [-3.8, -0.8],
  ])

  await expect(step).toMatchStepSnapshot(
    import.meta.path,
    "bottom-mounted-step-component",
  )
})
