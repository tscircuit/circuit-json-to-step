import type { CircuitJson } from "circuit-json"

export type BoardDrill = Extract<
  CircuitJson[number],
  { type: "pcb_hole" | "pcb_plated_hole" | "pcb_via" }
>

/** Records whose drills pass through the full substrate thickness. */
export function isBoardDrill(item: CircuitJson[number]): item is BoardDrill {
  if (item.type === "pcb_hole" || item.type === "pcb_plated_hole") return true
  if (item.type !== "pcb_via") return false
  if (item.through_hole !== undefined) return item.through_hole
  if (item.topmost_drill_layer || item.bottommost_drill_layer) {
    return (
      item.topmost_drill_layer === "top" &&
      item.bottommost_drill_layer === "bottom"
    )
  }
  const layers =
    item.from_layer && item.to_layer
      ? [item.from_layer, item.to_layer]
      : item.layers
  return layers.includes("top") && layers.includes("bottom")
}
