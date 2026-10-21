import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { jscadToStep } from "jscad-to-step"
import { circuitJsonToStep } from "../../../lib"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./imported-step-color-override.json"

// Fixture generated with @tscircuit/core@0.0.2165 from:
// <assembly.device>
//   <assembly.printedpart name="ORANGE_CASE" modelUrl="./blue-case.step" color="#ff6600" />
// </assembly.device>

test("imported STEP models preserve CAD color overrides", async () => {
  const blueCase = jscadToStep({
    type: "colorize",
    color: [0, 0, 1],
    shape: {
      type: "subtract",
      shapes: [
        { type: "cuboid", size: [10, 8, 4] },
        {
          type: "translate",
          vector: [0, 0, 1],
          shape: { type: "cuboid", size: [8, 6, 4] },
        },
      ],
    },
  })

  const step = await circuitJsonToStep(circuitJson as CircuitJson, {
    fsMap: { "./blue-case.step": blueCase },
  })
  const imported = await importStepWithOcct(step)
  expect(imported.success).toBe(true)
  expect(imported.meshes.map((mesh) => mesh.name)).toEqual(["ORANGE_CASE"])
  expect(imported.meshes[0].color![0]).toBe(1)
  expect(imported.meshes[0].color![1]).toBeCloseTo(0.1328683)
  expect(imported.meshes[0].color![2]).toBe(0)

  await expect(step).toMatchStepSnapshot(
    import.meta.path,
    "imported-step-color-override",
  )

  const template = (circuitJson as CircuitJson).find(
    (item) => item.type === "cad_component",
  )!
  // Reusing one URL must preserve each color, including the original blue.
  // Exercise both printed-part placement and the PCB model import path.
  for (const pcbPlacement of [false, true]) {
    const repeated: CircuitJson = ["red", undefined, "red"].flatMap(
      (color, index): CircuitJson => {
        const id = `case_${index}`
        return [
          {
            type: "source_component",
            source_component_id: id,
            name: id,
            ftype: "printedpart",
          },
          {
            ...template,
            cad_component_id: id,
            source_component_id: id,
            color,
            position: { x: index * 15, y: 0, z: 0 },
            ...(pcbPlacement
              ? {
                  pcb_component_id: id,
                  model_origin_position: undefined,
                  model_unit_to_mm_scale_factor: undefined,
                }
              : {}),
          },
          ...(pcbPlacement
            ? ([
                {
                  type: "pcb_component",
                  pcb_component_id: id,
                  source_component_id: id,
                  center: { x: index * 15, y: 0 },
                  width: 10,
                  height: 8,
                  rotation: 0,
                  layer: "top",
                },
              ] as CircuitJson)
            : []),
        ]
      },
    )
    const exported = await circuitJsonToStep(repeated, {
      fsMap: { "./blue-case.step": blueCase },
    })
    const meshes = (await importStepWithOcct(exported)).meshes
    expect(meshes.map((mesh) => mesh.color)).toEqual([
      [1, 0, 0],
      [0, 0, 1],
      [1, 0, 0],
    ])
    for (const mesh of meshes)
      for (const face of mesh.brep_faces)
        expect(face.color ?? mesh.color).toEqual(mesh.color)
    if (!pcbPlacement)
      expect(exported.match(/= MANIFOLD_SOLID_BREP\(/g)).toHaveLength(2)
    else {
      const pcbStep = await circuitJsonToStep(repeated, {
        exportMode: "pcb",
        boardWidth: 80,
        boardHeight: 20,
        includeComponents: true,
        includeExternalMeshes: true,
        fsMap: { "./blue-case.step": blueCase },
      })
      expect(
        (await importStepWithOcct(pcbStep)).meshes
          .slice(1)
          .map((mesh) => mesh.color),
      ).toEqual(meshes.map((mesh) => mesh.color))
      // One PCB and two color variants; the second red model reuses geometry.
      expect(pcbStep.match(/= MANIFOLD_SOLID_BREP\(/g)).toHaveLength(3)
    }
  }
})
