import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { jscadToStep } from "jscad-to-step"
import {
  MechanicalDesignGeometricPresentationRepresentation,
  Ref,
  StyledItem,
  parseRepository,
} from "stepts"
import { circuitJsonToStep } from "../../../lib"
import {
  PCB_SUBSTRATE_COLOR_RGB,
  createStyleCache,
  createStyledItem,
} from "../../../lib/step-style-utils"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./imported-step-color-override.json"

// Inspect STEP styles directly: OCCT does not expose these face colors when
// the solid is nested in an assembly, even though the exported styles remain.
function getFaceColors(step: string) {
  const repo = parseRepository(step)
  return repo.entries().flatMap(([, entity]) => {
    if (
      !(entity instanceof StyledItem) ||
      entity.item.resolve(repo).type !== "ADVANCED_FACE"
    )
      return []
    const assignment = entity.styles[0].resolve(repo)
    const usage = assignment.items[0].resolve(repo)
    const side = usage.style.resolve(repo)
    const fill = side.styles[0].resolve(repo).style.resolve(repo)
    const color = fill.items[0].resolve(repo).colour.resolve(repo)
    return [[color.r, color.g, color.b]]
  })
}

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

  // Give two faces their own colors, which take precedence over solid blue.
  const repo = parseRepository(blueCase)
  const faces = repo
    .entries()
    .filter(([, entity]) => entity.type === "ADVANCED_FACE")
  expect(faces.length).toBeGreaterThan(2)
  const presentation = repo
    .entries()
    .map(([, entity]) => entity)
    .find(
      (entity) =>
        entity instanceof MechanicalDesignGeometricPresentationRepresentation,
    )!
  const styleCache = createStyleCache()
  for (const [index, rgb] of (
    [
      [0, 1, 0],
      [0, 1, 1],
    ] as [number, number, number][]
  ).entries()) {
    presentation.items.push(
      createStyledItem(repo, {
        itemRef: new Ref(faces[index]![0]),
        rgb,
        styleCache,
      }),
    )
  }
  const multicolorCase = repo.toPartFile({
    name: "case with individually colored faces",
  })
  const source = (await importStepWithOcct(multicolorCase)).meshes
  expect(source).toHaveLength(1)
  expect(source[0].color).toEqual([0, 0, 1])
  const sourceFaceColors = source[0].brep_faces.map((face) => face.color)
  // Verify actual per-face STEP styles survive OCCT import before testing overrides.
  expect(sourceFaceColors.filter((color) => color !== null)).toHaveLength(2)
  expect(sourceFaceColors).toContainEqual([0, 1, 0])
  expect(sourceFaceColors).toContainEqual([0, 1, 1])

  await expect(multicolorCase).toMatchStepSnapshot(
    import.meta.path,
    "imported-step-color-override-source",
  )

  const step = await circuitJsonToStep(circuitJson as CircuitJson, {
    fsMap: { "./blue-case.step": multicolorCase },
  })
  // Face styles override solid styles in STEP viewers, so none may retain the
  // original green/cyan after applying the orange override.
  expect(getFaceColors(step)).toEqual([])
  const imported = await importStepWithOcct(step)
  expect(imported.success).toBe(true)
  expect(imported.meshes.map((mesh) => mesh.name)).toEqual(["ORANGE_CASE"])
  expect(imported.meshes[0].color![0]).toBe(1)
  expect(imported.meshes[0].color![1]).toBeCloseTo(0.1328683)
  expect(imported.meshes[0].color![2]).toBe(0)
  expect(imported.meshes[0].brep_faces).toHaveLength(sourceFaceColors.length)
  for (const face of imported.meshes[0].brep_faces)
    expect(face.color ?? imported.meshes[0].color).toEqual(
      imported.meshes[0].color,
    )

  await expect(step).toMatchStepSnapshot(
    import.meta.path,
    "imported-step-color-override",
  )

  const template = (circuitJson as CircuitJson).find(
    (item) => item.type === "cad_component",
  )!
  // Reusing one URL must preserve each color, including the original solid and face colors.
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
      fsMap: { "./blue-case.step": multicolorCase },
    })
    const meshes = (await importStepWithOcct(exported)).meshes
    expect(meshes.map((mesh) => mesh.color)).toEqual([
      [1, 0, 0],
      [0, 0, 1],
      [1, 0, 0],
    ])
    // Only the instance without an override retains its two source face styles.
    expect(getFaceColors(exported)).toEqual([
      [0, 1, 0],
      [0, 1, 1],
    ])
    for (const mesh of [meshes[0], meshes[2]]) {
      expect(mesh.brep_faces).toHaveLength(sourceFaceColors.length)
      for (const face of mesh.brep_faces)
        expect(face.color ?? mesh.color).toEqual([1, 0, 0])
    }
    if (!pcbPlacement)
      expect(exported.match(/= MANIFOLD_SOLID_BREP\(/g)).toHaveLength(2)
    else {
      const pcbStep = await circuitJsonToStep(repeated, {
        exportMode: "pcb",
        boardWidth: 80,
        boardHeight: 20,
        includeComponents: true,
        includeExternalMeshes: true,
        fsMap: { "./blue-case.step": multicolorCase },
      })
      // Exclude the board's own green faces when checking imported part styles.
      expect(
        getFaceColors(pcbStep).filter((color) =>
          color.some(
            (value, index) => value !== PCB_SUBSTRATE_COLOR_RGB[index],
          ),
        ),
      ).toEqual([
        [0, 1, 0],
        [0, 1, 1],
      ])
      const pcbMeshes = (await importStepWithOcct(pcbStep)).meshes.slice(1)
      expect(pcbMeshes.map((mesh) => mesh.color)).toEqual(
        meshes.map((mesh) => mesh.color),
      )
      expect(
        pcbMeshes.map((mesh) =>
          mesh.brep_faces.map((face) => face.color ?? mesh.color),
        ),
      ).toEqual(
        meshes.map((mesh) =>
          mesh.brep_faces.map((face) => face.color ?? mesh.color),
        ),
      )
      // One PCB and two color variants; the second red model reuses geometry.
      expect(pcbStep.match(/= MANIFOLD_SOLID_BREP\(/g)).toHaveLength(3)
    }
  }
})
