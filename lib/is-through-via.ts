import type { CircuitJson, PcbVia } from "circuit-json"

/**
 * Whether an element is a via whose barrel runs from the top copper layer to
 * the bottom one, and so is drilled through the board.
 *
 * Blind vias (an outer layer to an inner layer) and buried vias (inner layers
 * only) stop inside the board. The STEP substrate is a single solid with no
 * inner-layer depths, so they are not drilled at all rather than cut through.
 */
export function isThroughVia(item: CircuitJson[number]): item is PcbVia {
  if (item.type !== "pcb_via") return false
  if (item.through_hole !== undefined) return item.through_hole
  if (item.topmost_drill_layer && item.bottommost_drill_layer) {
    return (
      item.topmost_drill_layer === "top" &&
      item.bottommost_drill_layer === "bottom"
    )
  }
  // `layers` lists every copper layer the barrel crosses; core writes it and
  // the Gerber drill export reads it. The deprecated from/to pair may only
  // describe a trace's layer change, so it is a fallback for older JSON.
  const layers = item.layers?.length
    ? item.layers
    : [item.from_layer, item.to_layer].filter((layer) => layer !== undefined)
  // No span information: assume a through via, as the drill export does.
  if (layers.length === 0) return true
  return layers.includes("top") && layers.includes("bottom")
}
