import type { PcbHoleOval } from "circuit-json"
import { coordinateOf } from "./pill-geometry"

/**
 * Counter-clockwise elliptical boundary in board-world millimeters (+X right,
 * +Y up). Uses the panel exporter's 64-segment curve resolution; unlike a pill,
 * an oval has no straight sides.
 */
export function getOvalHolePoints(hole: PcbHoleOval) {
  const x = coordinateOf(hole.x)
  const y = coordinateOf(hole.y)
  const radiusX = hole.hole_width / 2
  const radiusY = hole.hole_height / 2
  if (!(radiusX > 0 && radiusY > 0)) {
    throw new Error("Oval hole dimensions must be positive")
  }
  return Array.from({ length: 64 }, (_, index) => {
    const angle = (index * Math.PI * 2) / 64
    return {
      x: x + radiusX * Math.cos(angle),
      y: y + radiusY * Math.sin(angle),
    }
  })
}
