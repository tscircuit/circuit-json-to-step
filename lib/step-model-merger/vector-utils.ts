import type { Vector3 } from "./types"

export function asVector3(value?: Partial<Vector3>): Vector3 {
  return {
    x: value?.x ?? 0,
    y: value?.y ?? 0,
    z: value?.z ?? 0,
  }
}

export function toRadians(rotation: Vector3): Vector3 {
  const factor = Math.PI / 180
  return {
    x: rotation.x * factor,
    y: rotation.y * factor,
    z: rotation.z * factor,
  }
}

export function transformPoint(
  point: [number, number, number],
  rotation: Vector3,
  translation: Vector3,
): [number, number, number] {
  const rotated = rotateVector(point, rotation)
  return [
    rotated[0] + translation.x,
    rotated[1] + translation.y,
    rotated[2] + translation.z,
  ]
}

export function transformDirection(
  vector: [number, number, number],
  rotation: Vector3,
): [number, number, number] {
  return rotateVector(vector, rotation)
}

export function rotateVector(
  vector: [number, number, number],
  rotation: Vector3,
): [number, number, number] {
  let [x, y, z] = vector

  if (rotation.x !== 0) {
    const cosX = Math.cos(rotation.x)
    const sinX = Math.sin(rotation.x)
    const y1 = y * cosX - z * sinX
    const z1 = y * sinX + z * cosX
    y = y1
    z = z1
  }

  if (rotation.y !== 0) {
    const cosY = Math.cos(rotation.y)
    const sinY = Math.sin(rotation.y)
    const x1 = x * cosY + z * sinY
    const z1 = -x * sinY + z * cosY
    x = x1
    z = z1
  }

  if (rotation.z !== 0) {
    const cosZ = Math.cos(rotation.z)
    const sinZ = Math.sin(rotation.z)
    const x1 = x * cosZ - y * sinZ
    const y1 = x * sinZ + y * cosZ
    x = x1
    y = y1
  }

  return [x, y, z]
}
