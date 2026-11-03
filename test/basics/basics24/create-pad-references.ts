import type { CircuitJson } from "circuit-json"
import type { jscadToStep } from "jscad-to-step"

type JscadOperation = Extract<
  Parameters<typeof jscadToStep>[0],
  { type: string }
>

function createCapsule({
  width,
  height,
  thickness,
}: {
  width: number
  height: number
  thickness: number
}): JscadOperation {
  const radius = Math.min(width, height) / 2
  const cylinder: JscadOperation = {
    type: "cylinder",
    radius,
    height: thickness,
  }
  if (width === height) return cylinder
  const horizontal = width > height
  const offset = Math.abs(width - height) / 2
  return {
    type: "union",
    shapes: [
      {
        type: "cuboid",
        size: horizontal
          ? [width - height, height, thickness]
          : [width, height - width, thickness],
      },
      ...[-1, 1].map(
        (side): JscadOperation => ({
          type: "translate",
          vector: horizontal ? [side * offset, 0, 0] : [0, side * offset, 0],
          shape: cylinder,
        }),
      ),
    ],
  }
}

/** Reference copper for the snapshot; this is not added to production STEP exports. */
export function createPadReferences(circuitJson: CircuitJson): CircuitJson {
  const board = circuitJson.find((element) => element.type === "pcb_board")!
  const thickness = 0.035
  return circuitJson.flatMap((hole): CircuitJson => {
    if (hole.type !== "pcb_plated_hole") return []
    if (hole.shape !== "circle" && hole.shape !== "pill") {
      throw new Error("This fixture expects circle or pill pads")
    }
    const width =
      hole.shape === "circle" ? hole.outer_diameter : hole.outer_width
    const height =
      hole.shape === "circle" ? hole.outer_diameter : hole.outer_height
    const drillWidth =
      hole.shape === "circle" ? hole.hole_diameter : hole.hole_width
    const drillHeight =
      hole.shape === "circle" ? hole.hole_diameter : hole.hole_height
    const name = `${hole.pcb_plated_hole_id}_pad_reference`
    return [
      {
        type: "source_component",
        source_component_id: name,
        ftype: "printedpart",
        name,
      },
      {
        type: "cad_component",
        cad_component_id: `${name}_cad`,
        source_component_id: name,
        position: {
          x: hole.x,
          y: hole.y,
          z: (board.thickness ?? 1.6) / 2 + thickness / 2,
        },
        color: "#b87333",
        anchor_alignment: "center",
        model_object_fit: "contain_within_bounds",
        model_jscad: {
          type: "subtract",
          shapes: [
            createCapsule({ width, height, thickness }),
            createCapsule({
              width: drillWidth,
              height: drillHeight,
              thickness: thickness * 3,
            }),
          ],
        },
      },
    ]
  })
}
