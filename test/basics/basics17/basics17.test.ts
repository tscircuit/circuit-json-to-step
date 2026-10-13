import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { jscadToStep } from "jscad-to-step"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct, type OcctMesh } from "../../utils/occt/importer"
import { loadStepFilesFromCircuitJson } from "../../utils/load-step-files"
import pcbFixture from "../basics06/basics06.json"
import circuitJson from "./basics17.json"

test("basics17: full STEP assembly retains cached instances, CAD transforms, and PCB component models", async () => {
  const fsMap = {
    "./cached.step": jscadToStep({
      type: "translate",
      vector: [1, 2, 3],
      shape: { type: "cuboid", size: [2, 4, 6] },
    }),
  }
  const step = await circuitJsonToStep(circuitJson as CircuitJson, {
    exportMode: "assembly",
    productName: "Whole device",
    fsMap,
  })
  const imported = await importStepWithOcct(step)
  expect(imported.meshes.slice(0, 6).map((mesh) => mesh.name)).toEqual([
    "PCB",
    "BRACKET",
    "SCREW",
    "orphan_model",
    "CACHED",
    "CACHED_COPY",
  ])
  expect(imported.meshes.length).toBeGreaterThan(6)
  expect(imported.root.children[0].children[6].name).toBe("R1")
  expect(imported.root.children[0].children[6].meshes.length).toBeGreaterThan(0)
  expect(imported.root.children[0].name).toBe("Whole device")
  expect(imported.root.children[0].children).toHaveLength(7)
  expect(imported.meshes[1].color).toEqual([1, 0, 0])
  assertBounds(imported.meshes[0], [
    [-10, 10],
    [-6, 6],
    [-0.8, 0.8],
  ])
  expect(imported.meshes[0].color![1]).toBeCloseTo(0.3185468)
  assertBounds(imported.meshes[4], [
    [6, 14],
    [18, 22],
    [24, 36],
  ])
  assertBounds(imported.meshes[5], [
    [-11, -9],
    [-22, -18],
    [-3, 3],
  ])

  const realStepFiles = await loadStepFilesFromCircuitJson(pcbFixture)
  const pcbAssembly = await importStepWithOcct(
    await circuitJsonToStep(pcbFixture as CircuitJson, {
      exportMode: "assembly",
      fsMap: realStepFiles,
    }),
  )
  expect(
    pcbAssembly.root.children[0].children.map((child) => child.name),
  ).toEqual(["PCB", "R1", "SW1"])
  expect(pcbAssembly.meshes.length).toBeGreaterThan(2)
  expect(pcbAssembly.meshes.some((mesh) => mesh.name === "R1")).toBe(true)
  expect(pcbAssembly.meshes.some((mesh) => mesh.name === "SW1")).toBe(true)

  await expect(
    circuitJsonToStep(
      [
        {
          type: "source_component",
          source_component_id: "empty",
          name: "EMPTY",
          ftype: "motor",
        },
      ] as CircuitJson,
      { exportMode: "assembly" },
    ),
  ).rejects.toThrow("No assembly geometry")
  await expect(
    circuitJsonToStep(circuitJson as CircuitJson, {
      exportMode: "assembly",
      fsMap: { "./cached.step": "" },
    }),
  ).rejects.toThrow()
}, 30_000)

function assertBounds(mesh: OcctMesh, bounds: number[][]) {
  for (const [axis, [min, max]] of bounds.entries()) {
    const coordinates = mesh.attributes.position.array.filter(
      (_, index) => index % 3 === axis,
    )
    expect(Math.min(...coordinates)).toBeCloseTo(min)
    expect(Math.max(...coordinates)).toBeCloseTo(max)
  }
}
