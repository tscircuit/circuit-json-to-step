import { expect, test } from "bun:test"

import { createFallbackComponentBoxes } from "../lib/mesh-generation"

test("creates fallback STEP boxes from pcb_component rectangles", () => {
  const boxes = createFallbackComponentBoxes(
    [
      {
        type: "source_component",
        source_component_id: "source_component_1",
        name: "R1",
        supplier_part_numbers: {},
        ftype: "simple_resistor",
      },
      {
        type: "pcb_component",
        pcb_component_id: "pcb_component_1",
        source_component_id: "source_component_1",
        center: { x: 12, y: 7 },
        width: 3.2,
        height: 1.6,
        layer: "top",
        rotation: 90,
      },
      {
        type: "pcb_component",
        pcb_component_id: "pcb_component_2",
        center: { x: -4, y: 2 },
        width: 2,
        height: 1.25,
        layer: "bottom",
      },
    ] as any,
    1.6,
  )

  expect(boxes).toHaveLength(2)
  expect(boxes[0]).toMatchObject({
    center: { x: 12, y: 1.1, z: 7 },
    size: { x: 3.2, y: 0.6, z: 1.6 },
    label: "R1",
  })
  expect(boxes[0]!.rotation?.y).toBeCloseTo(-Math.PI / 2)

  expect(boxes[1]).toMatchObject({
    center: { x: -4, y: -1.1, z: 2 },
    size: { x: 2, y: 0.6, z: 1.25 },
    label: "pcb_component_2",
  })
})

test("skips fallback component boxes with missing dimensions", () => {
  const boxes = createFallbackComponentBoxes(
    [
      {
        type: "pcb_component",
        pcb_component_id: "missing_width",
        center: { x: 0, y: 0 },
        height: 1,
        layer: "top",
      },
    ] as any,
    1.6,
  )

  expect(boxes).toHaveLength(0)
})
