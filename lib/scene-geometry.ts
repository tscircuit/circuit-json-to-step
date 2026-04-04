export type Point3 = { x: number; y: number; z: number }

export type Rotation3 = { x: number; y: number; z: number }

export type Triangle = {
  vertices: [Point3, Point3, Point3]
  normal: Point3
}

export type BoundingBox = {
  min: Point3
  max: Point3
}

export type SceneBox = {
  center: Point3
  size: Point3
  rotation?: Rotation3
  mesh?: {
    boundingBox: BoundingBox
    triangles?: Triangle[]
  }
}

export function rotatePoint3(point: Point3, rotation?: Rotation3): Point3 {
  if (!rotation) return point

  let { x, y, z } = point

  if (rotation.x) {
    const cos = Math.cos(rotation.x)
    const sin = Math.sin(rotation.x)
    const nextY = y * cos - z * sin
    const nextZ = y * sin + z * cos
    y = nextY
    z = nextZ
  }

  if (rotation.y) {
    const cos = Math.cos(rotation.y)
    const sin = Math.sin(rotation.y)
    const nextX = x * cos + z * sin
    const nextZ = -x * sin + z * cos
    x = nextX
    z = nextZ
  }

  if (rotation.z) {
    const cos = Math.cos(rotation.z)
    const sin = Math.sin(rotation.z)
    const nextX = x * cos - y * sin
    const nextY = x * sin + y * cos
    x = nextX
    y = nextY
  }

  return { x, y, z }
}
