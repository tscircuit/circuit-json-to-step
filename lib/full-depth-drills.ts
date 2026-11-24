import type { CircuitJson, PcbVia } from "circuit-json"

/** Holes, plated holes and vias, before checking how deep each one goes. */
export type DrillCandidate = Extract<
  CircuitJson[number],
  { type: "pcb_hole" | "pcb_plated_hole" | "pcb_via" }
>

/**
 * Whether a via's barrel runs from the top copper layer to the bottom one.
 *
 * Blind vias (one outer layer to an inner layer) and buried vias (inner layers
 * only) stop inside the board. The STEP substrate is a single solid with no
 * inner-layer depths, so they are not drilled at all rather than cut through.
 */
export function isThroughVia(via: PcbVia): boolean {
  if (via.through_hole !== undefined) return via.through_hole
  if (via.topmost_drill_layer && via.bottommost_drill_layer) {
    return (
      via.topmost_drill_layer === "top" &&
      via.bottommost_drill_layer === "bottom"
    )
  }
  // `layers` lists every copper layer the barrel crosses; core writes it and
  // the Gerber drill export reads it. The deprecated from/to pair may only
  // describe a trace's layer change, so it is a fallback for older JSON.
  const layers = via.layers?.length
    ? via.layers
    : [via.from_layer, via.to_layer].filter((layer) => layer !== undefined)
  // No span information: assume a through via, as the drill export does.
  if (layers.length === 0) return true
  return layers.includes("top") && layers.includes("bottom")
}

/** Records that cut through the full substrate thickness. */
export function isFullDepthDrill(
  item: CircuitJson[number],
): item is DrillCandidate {
  if (item.type === "pcb_hole" || item.type === "pcb_plated_hole") return true
  return item.type === "pcb_via" && isThroughVia(item)
}
