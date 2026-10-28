import type { CircuitJson } from "circuit-json"

type Board = Extract<CircuitJson[number], { type: "pcb_board" }>

/** Scope holes and cutouts to one board; ambiguous ownership must not create a partial assembly. */
export function selectBoardGeometry(
  circuitJson: CircuitJson,
  selected: Board,
): CircuitJson {
  const boards = circuitJson.filter((item) => item.type === "pcb_board")
  return circuitJson.filter((item) => {
    if (item.type === "pcb_board") return item === selected
    if (
      item.type !== "pcb_hole" &&
      item.type !== "pcb_plated_hole" &&
      item.type !== "pcb_cutout"
    )
      return true
    const record = item as unknown as Record<string, unknown>
    let owners = boards.filter((board) => {
      const boardRecord = board as unknown as Record<string, unknown>
      return ["pcb_board_id", "pcb_group_id", "subcircuit_id"].some(
        (key) => record[key] && record[key] === boardRecord[key],
      )
    })
    if (owners.length === 0) {
      const { x, y } = getReferencePoint(item)
      owners = boards.filter((board) => {
        if (board.outline?.length) return pointInOutline(x, y, board.outline)
        return (
          Math.abs(x - board.center.x) <= (board.width ?? NaN) / 2 &&
          Math.abs(y - board.center.y) <= (board.height ?? NaN) / 2
        )
      })
    }
    if (owners.length !== 1)
      throw new Error(
        "Cannot determine which PCB owns a hole or cutout in a multi-board assembly",
      )
    return owners[0] === selected
  })
}

function pointInOutline(
  x: number,
  y: number,
  outline: { x: number; y: number }[],
) {
  let inside = false
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const a = outline[i]!,
      b = outline[j]!
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside
  }
  return inside
}

function getReferencePoint(item: CircuitJson[number]): {
  x: number
  y: number
} {
  if (item.type === "pcb_cutout") {
    if (item.shape === "polygon") {
      const points = item.points
      return {
        x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
        y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
      }
    }
    if (item.shape === "path") return item.route[0] ?? { x: NaN, y: NaN }
    return item.center
  }
  const record = item as unknown as Record<string, unknown>
  return {
    x: typeof record.x === "number" ? record.x : NaN,
    y: typeof record.y === "number" ? record.y : NaN,
  }
}
