import type { Entity, Ref, Repository } from "stepts"
import {
  ColourRgb,
  FillAreaStyle,
  FillAreaStyleColour,
  PresentationStyleAssignment,
  StyledItem,
  SurfaceSideStyle,
  SurfaceStyleFillArea,
  SurfaceStyleUsage,
} from "stepts"

export type StyleCache = Map<string, Ref<PresentationStyleAssignment>>

export function createStyleCache(): StyleCache {
  return new Map<string, Ref<PresentationStyleAssignment>>()
}

export function createStyledItem(
  repo: Repository,
  itemRef: Ref<Entity>,
  rgb: [number, number, number],
  styleCache: StyleCache,
  name = "color",
): Ref<StyledItem> {
  const key = rgb.map((value) => value.toFixed(6)).join(",")
  let presStyle = styleCache.get(key)

  if (!presStyle) {
    const color = repo.add(new ColourRgb("", rgb[0], rgb[1], rgb[2]))
    const fillColor = repo.add(new FillAreaStyleColour("", color))
    const fillStyle = repo.add(new FillAreaStyle("", [fillColor]))
    const surfaceFill = repo.add(new SurfaceStyleFillArea(fillStyle))
    const surfaceSide = repo.add(new SurfaceSideStyle("", [surfaceFill]))
    const surfaceUsage = repo.add(new SurfaceStyleUsage(".BOTH.", surfaceSide))
    presStyle = repo.add(new PresentationStyleAssignment([surfaceUsage]))
    styleCache.set(key, presStyle)
  }

  return repo.add(new StyledItem(name, [presStyle], itemRef))
}

export function createStyledItems(
  repo: Repository,
  itemRefs: ReadonlyArray<Ref<Entity>>,
  rgb: [number, number, number],
  styleCache: StyleCache,
  name = "color",
): Ref<StyledItem>[] {
  return itemRefs.map((itemRef) =>
    createStyledItem(repo, itemRef, rgb, styleCache, name),
  )
}
