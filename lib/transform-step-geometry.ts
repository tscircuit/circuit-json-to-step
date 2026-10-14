import { CartesianPoint, Unknown, type Entity } from "stepts"

/** Bake local origin and uniform scale into BREP geometry, preserving analytic surfaces. */
export function transformStepGeometry(
  entries: ReadonlyArray<readonly [number, Entity]>,
  origin: { x: number; y: number; z: number },
  scale: number,
) {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error("STEP model scale must be a positive finite number")
  }
  for (const [, entity] of entries) {
    if (entity instanceof CartesianPoint) {
      entity.x = (entity.x - origin.x) * scale
      entity.y = (entity.y - origin.y) * scale
      entity.z = (entity.z - origin.z) * scale
    }
    // Dimensional parameters of the analytic entities supported by stepts.
    for (const key of [
      "radius",
      "majorRadius",
      "minorRadius",
      "semiAxis1",
      "semiAxis2",
      "magnitude",
    ]) {
      const properties = entity as unknown as Record<string, unknown>
      if (typeof properties[key] === "number") properties[key] *= scale
    }
    if (
      entity instanceof Unknown &&
      ["OFFSET_SURFACE", "OFFSET_CURVE_2D", "OFFSET_CURVE_3D"].includes(
        entity.type,
      )
    ) {
      const distance = Number(entity.args[2])
      if (Number.isFinite(distance)) entity.args[2] = String(distance * scale)
    }
  }
}
