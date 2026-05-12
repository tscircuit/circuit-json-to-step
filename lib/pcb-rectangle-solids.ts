import type { CircuitJson } from "circuit-json"
import type { Ref, Repository, StyledItem } from "stepts"
import { createSceneBoxSolid } from "./scene-box-to-step"
import type { GeneratedSceneSolid, SceneBox } from "./scene-geometry"

type LayerRef = string | { name?: string }

type RectElement = {
  type: string
  shape?: string
  layer?: LayerRef
  x?: number
  y?: number
  center?: { x: number; y: number }
  width?: number
  height?: number
  ccw_rotation?: number
  rotation?: number
  stroke_width?: number
  is_filled?: boolean
  has_stroke?: boolean
  pcb_smtpad_id?: string
  pcb_solder_paste_id?: string
  pcb_silkscreen_rect_id?: string
}

type PcbRectangleSolid = GeneratedSceneSolid & {
  rgb: [number, number, number]
}

type PcbRectangleSolidOptions = {
  repo: Repository
  circuitJson: CircuitJson
  boardThickness: number
}

const COPPER_THICKNESS = 0.035
const SOLDER_PASTE_THICKNESS = 0.025
const SILKSCREEN_THICKNESS = 0.015

const COPPER_RGB: [number, number, number] = [0.95, 0.64, 0.18]
const SOLDER_PASTE_RGB: [number, number, number] = [0.82, 0.82, 0.78]
const SILKSCREEN_RGB: [number, number, number] = [0.95, 0.95, 0.95]

export function generatePcbRectangleSolids(
  options: PcbRectangleSolidOptions,
): PcbRectangleSolid[] {
  const solids: PcbRectangleSolid[] = []

  for (const element of options.circuitJson as RectElement[]) {
    if (element.type === "pcb_smtpad") {
      const solid = createRectSolidFromElement(options, element, {
        thickness: COPPER_THICKNESS,
        rgb: COPPER_RGB,
        label: element.pcb_smtpad_id ?? "pcb_smtpad",
      })
      if (solid) solids.push(solid)
      continue
    }

    if (element.type === "pcb_solder_paste") {
      const solid = createRectSolidFromElement(options, element, {
        thickness: SOLDER_PASTE_THICKNESS,
        rgb: SOLDER_PASTE_RGB,
        label: element.pcb_solder_paste_id ?? "pcb_solder_paste",
      })
      if (solid) solids.push(solid)
      continue
    }

    if (element.type === "pcb_silkscreen_rect") {
      solids.push(...createSilkscreenRectSolids(options, element))
    }
  }

  return solids
}

function createSilkscreenRectSolids(
  options: PcbRectangleSolidOptions,
  element: RectElement,
): PcbRectangleSolid[] {
  const width = element.width ?? 0
  const height = element.height ?? 0
  const hasStroke = element.has_stroke !== false

  if (element.is_filled || !hasStroke) {
    const solid = createRectSolidFromElement(options, element, {
      thickness: SILKSCREEN_THICKNESS,
      rgb: SILKSCREEN_RGB,
      label: element.pcb_silkscreen_rect_id ?? "pcb_silkscreen_rect",
    })
    return solid ? [solid] : []
  }

  const center = getElementCenter(element)
  const strokeWidth = Math.min(element.stroke_width ?? 0.15, width, height)
  if (!center || width <= 0 || height <= 0 || strokeWidth <= 0) return []

  const id = element.pcb_silkscreen_rect_id ?? "pcb_silkscreen_rect"
  const rotationDegrees = element.rotation ?? element.ccw_rotation ?? 0
  const halfWidth = width / 2
  const halfHeight = height / 2
  const halfStroke = strokeWidth / 2
  const bars = [
    {
      label: `${id}_top`,
      x: 0,
      y: halfHeight - halfStroke,
      width,
      height: strokeWidth,
    },
    {
      label: `${id}_bottom`,
      x: 0,
      y: -halfHeight + halfStroke,
      width,
      height: strokeWidth,
    },
    {
      label: `${id}_left`,
      x: -halfWidth + halfStroke,
      y: 0,
      width: strokeWidth,
      height,
    },
    {
      label: `${id}_right`,
      x: halfWidth - halfStroke,
      y: 0,
      width: strokeWidth,
      height,
    },
  ]

  const solids: PcbRectangleSolid[] = []
  for (const bar of bars) {
    const barCenter = rotateOffset(bar.x, bar.y, rotationDegrees)
    const solid = createRectSolid(options, {
      label: bar.label,
      center: { x: center.x + barCenter.x, y: center.y + barCenter.y },
      width: bar.width,
      height: bar.height,
      layer: element.layer,
      rotationDegrees,
      thickness: SILKSCREEN_THICKNESS,
      rgb: SILKSCREEN_RGB,
    })
    if (solid) solids.push(solid)
  }

  return solids
}

function createRectSolidFromElement(
  options: PcbRectangleSolidOptions,
  element: RectElement,
  style: {
    thickness: number
    rgb: [number, number, number]
    label: string
  },
): PcbRectangleSolid | null {
  if (element.shape !== "rect" && element.shape !== "rotated_rect") return null

  const center = getElementCenter(element)
  if (!center || !element.width || !element.height) return null

  return createRectSolid(options, {
    label: style.label,
    center,
    width: element.width,
    height: element.height,
    layer: element.layer,
    rotationDegrees: element.ccw_rotation ?? element.rotation ?? 0,
    thickness: style.thickness,
    rgb: style.rgb,
  })
}

function createRectSolid(
  options: PcbRectangleSolidOptions,
  rect: {
    label: string
    center: { x: number; y: number }
    width: number
    height: number
    layer?: LayerRef
    rotationDegrees: number
    thickness: number
    rgb: [number, number, number]
  },
): PcbRectangleSolid | null {
  if (rect.width <= 0 || rect.height <= 0 || rect.thickness <= 0) return null

  const halfBoardThickness = options.boardThickness / 2
  const layer = getLayerName(rect.layer)
  const verticalCenter =
    layer === "bottom"
      ? -halfBoardThickness - rect.thickness / 2
      : halfBoardThickness + rect.thickness / 2

  const sceneBox: SceneBox = {
    center: { x: rect.center.x, y: verticalCenter, z: rect.center.y },
    size: { x: rect.width, y: rect.thickness, z: rect.height },
    rotation: { x: 0, y: degreesToRadians(-rect.rotationDegrees), z: 0 },
    label: rect.label,
  }
  const solid = createSceneBoxSolid(options.repo, sceneBox)

  return {
    ...solid,
    styledItems: solid.styledItems as Ref<StyledItem>[],
    rgb: rect.rgb,
  }
}

function getElementCenter(
  element: RectElement,
): { x: number; y: number } | null {
  if (element.center) return element.center
  if (typeof element.x === "number" && typeof element.y === "number") {
    return { x: element.x, y: element.y }
  }
  return null
}

function getLayerName(layer: LayerRef | undefined): string {
  if (!layer) return "top"
  if (typeof layer === "string") return layer
  return layer.name ?? "top"
}

function rotateOffset(
  x: number,
  y: number,
  degrees: number,
): { x: number; y: number } {
  if (!degrees) return { x, y }

  const radians = degreesToRadians(degrees)
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  }
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}
