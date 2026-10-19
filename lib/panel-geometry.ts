import type { CircuitJson } from "circuit-json"
import polygonClipping, { type Ring, type Polygon } from "polygon-clipping"
import {
  ClosedShell,
  ManifoldSolidBrep,
  type EdgeCurve,
  type Ref,
  type Repository,
} from "stepts"
import type { GeneratedSceneSolid } from "./scene-geometry"
import { createFaceFromVertices, createVertex } from "./step-brep-utils"
import { getPillGeometry, rotatePoint } from "./pill-geometry"

const SEGMENTS = 64
type Point = [number, number]
type Hole = Extract<
  CircuitJson[number],
  { type: "pcb_hole" | "pcb_plated_hole" }
>

/** Clip the panel in 2D, then extrude closed boundary loops with shared edges. */
export function generatePanelSolids({
  repo,
  circuitJson,
  boardThickness,
}: {
  repo: Repository
  circuitJson: CircuitJson
  boardThickness: number
}): GeneratedSceneSolid[] {
  const panel = circuitJson.find((item) => item.type === "pcb_panel")!
  const outline = rectangle(
    panel.center.x,
    panel.center.y,
    panel.width,
    panel.height,
  )
  const cuts: Polygon[] = []
  for (const item of circuitJson) {
    if (item.type === "pcb_hole" || item.type === "pcb_plated_hole") {
      const hole = item as unknown as Record<string, any>
      const shape = hole.hole_shape ?? hole.shape
      const x = hole.x + (hole.hole_offset_x ?? 0),
        y = hole.y + (hole.hole_offset_y ?? 0)
      if (
        shape === "pill" ||
        shape === "rotated_pill" ||
        shape === "pill_hole_with_rect_pad"
      ) {
        cuts.push([capsule(item)])
      } else if (
        shape === "circle" ||
        shape === "circular_hole_with_rect_pad"
      ) {
        cuts.push([circle(x, y, hole.hole_diameter / 2)])
      } else throw new Error(`Unsupported panel hole shape: ${shape}`)
    }
    if (item.type === "pcb_cutout" && !item.pcb_board_id) {
      if (item.shape === "polygon")
        cuts.push([item.points.map((p): Point => [p.x, p.y])])
      else if (item.shape === "circle")
        cuts.push([circle(item.center.x, item.center.y, item.radius)])
      else if (item.shape === "rect")
        cuts.push([
          rectangle(
            item.center.x,
            item.center.y,
            item.width,
            item.height,
            item.rotation ?? 0,
          ),
        ])
      else throw new Error("Unsupported panel cutout shape")
    }
  }
  const polygons = cuts.length
    ? polygonClipping.difference([outline], ...cuts)
    : [[outline]]
  return polygons.map((polygon) => {
    const loops = polygon.map((ring) => {
      const first = ring[0],
        last = ring[ring.length - 1]
      const points =
        first[0] === last[0] && first[1] === last[1] ? ring.slice(0, -1) : ring
      return {
        bottom: points.map(([x, y]) =>
          createVertex(repo, { x, y, z: -boardThickness / 2 }),
        ),
        top: points.map(([x, y]) =>
          createVertex(repo, { x, y, z: boardThickness / 2 }),
        ),
      }
    })
    const edges = new Map<string, Ref<EdgeCurve>>()
    const faces = [
      createFaceFromVertices(
        repo,
        [...loops[0].bottom].reverse(),
        edges,
        loops.slice(1).map((loop) => [...loop.bottom].reverse()),
      ),
      createFaceFromVertices(
        repo,
        loops[0].top,
        edges,
        loops.slice(1).map((loop) => loop.top),
      ),
    ]
    for (const loop of loops) {
      for (let i = 0; i < loop.top.length; i++) {
        const next = (i + 1) % loop.top.length
        faces.push(
          createFaceFromVertices(
            repo,
            [loop.bottom[i], loop.bottom[next], loop.top[next], loop.top[i]],
            edges,
          ),
        )
      }
    }
    const shell = repo.add(new ClosedShell("", faces))
    const solid = repo.add(new ManifoldSolidBrep("PCB Panel", shell))
    return {
      solid,
      styleTargets: [solid],
      styledItems: [],
      usesIntrinsicFaceStyles: false,
    }
  })
}

function rectangle(
  x: number,
  y: number,
  width: number,
  height: number,
  rotation = 0,
): Ring {
  return place(
    [
      [-width / 2, -height / 2],
      [width / 2, -height / 2],
      [width / 2, height / 2],
      [-width / 2, height / 2],
    ],
    x,
    y,
    (rotation * Math.PI) / 180,
  )
}
function circle(x: number, y: number, radius: number): Ring {
  if (!(radius > 0)) throw new Error("Panel hole radius must be positive")
  return Array.from(
    { length: SEGMENTS },
    (_, i): Point => [
      x + radius * Math.cos((i * Math.PI * 2) / SEGMENTS),
      y + radius * Math.sin((i * Math.PI * 2) / SEGMENTS),
    ],
  )
}
function capsule(hole: Hole): Ring {
  const geom = getPillGeometry(hole)
  if (!(geom.width > 0 && geom.height > 0))
    throw new Error("Panel hole dimensions must be positive")
  const points: Point[] = []
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i <= SEGMENTS / 2; i++) {
      const angle = -Math.PI / 2 + side * Math.PI + (i * Math.PI * 2) / SEGMENTS
      points.push([
        (side === 0 ? geom.straightHalfLength : -geom.straightHalfLength) +
          geom.radius * Math.cos(angle),
        geom.radius * Math.sin(angle),
      ])
    }
  }
  return place(
    points,
    geom.centerX,
    geom.centerY,
    geom.ccwRotationRadians + (geom.isHorizontal ? 0 : Math.PI / 2),
  )
}
function place(points: Point[], x: number, y: number, rotation: number): Ring {
  return points.map(([a, b]): Point => {
    const point = rotatePoint({
      x: a,
      y: b,
      centerX: 0,
      centerY: 0,
      ccwRotationRadians: rotation,
    })
    return [x + point.x, y + point.y]
  })
}
