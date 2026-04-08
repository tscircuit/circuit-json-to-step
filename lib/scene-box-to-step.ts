import type { Ref, Repository, StyledItem } from "stepts"
import { ClosedShell, ManifoldSolidBrep } from "stepts"
import type {
  GeneratedSceneSolid,
  SceneBox,
  TriangleColor,
} from "./scene-geometry"
import { createStyleCache, createStyledItem } from "./step-style-utils"
import { rotatePoint3 } from "./scene-geometry"
import { createFaceFromVertices, createVertex } from "./step-brep-utils"

export function createSceneBoxSolid(
  repo: Repository,
  box: SceneBox,
): GeneratedSceneSolid {
  if (box.mesh?.triangles?.length) {
    return createSceneMeshSolid(repo, box)
  }

  const localBounds = box.mesh?.boundingBox
    ? {
        min: box.mesh.boundingBox.min,
        max: box.mesh.boundingBox.max,
      }
    : {
        min: {
          x: -box.size.x / 2,
          y: -box.size.y / 2,
          z: -box.size.z / 2,
        },
        max: {
          x: box.size.x / 2,
          y: box.size.y / 2,
          z: box.size.z / 2,
        },
      }

  const corners = [
    { x: localBounds.min.x, y: localBounds.min.y, z: localBounds.min.z },
    { x: localBounds.max.x, y: localBounds.min.y, z: localBounds.min.z },
    { x: localBounds.max.x, y: localBounds.max.y, z: localBounds.min.z },
    { x: localBounds.min.x, y: localBounds.max.y, z: localBounds.min.z },
    { x: localBounds.min.x, y: localBounds.min.y, z: localBounds.max.z },
    { x: localBounds.max.x, y: localBounds.min.y, z: localBounds.max.z },
    { x: localBounds.max.x, y: localBounds.max.y, z: localBounds.max.z },
    { x: localBounds.min.x, y: localBounds.max.y, z: localBounds.max.z },
  ].map((corner) => {
    const rotated = rotatePoint3(corner, box.rotation)
    return {
      x: rotated.x + box.center.x,
      y: rotated.y + box.center.y,
      z: rotated.z + box.center.z,
    }
  })

  const stepCorners = corners.map((corner) => ({
    x: corner.x,
    y: corner.z,
    z: corner.y,
  }))

  const vertices = stepCorners.map((corner) => createVertex(repo, corner))
  const faces = [
    [vertices[0]!, vertices[1]!, vertices[2]!, vertices[3]!],
    [vertices[4]!, vertices[7]!, vertices[6]!, vertices[5]!],
    [vertices[0]!, vertices[4]!, vertices[5]!, vertices[1]!],
    [vertices[1]!, vertices[5]!, vertices[6]!, vertices[2]!],
    [vertices[2]!, vertices[6]!, vertices[7]!, vertices[3]!],
    [vertices[3]!, vertices[7]!, vertices[4]!, vertices[0]!],
  ].map((faceVertices) => createFaceFromVertices(repo, faceVertices))

  const shell = repo.add(new ClosedShell("", faces))
  return {
    solid: repo.add(new ManifoldSolidBrep(box.label ?? "Component", shell)),
    styledItems: [],
    usesIntrinsicFaceStyles: false,
    styleTargets: faces,
  }
}

function createSceneMeshSolid(
  repo: Repository,
  box: SceneBox,
): GeneratedSceneSolid {
  const styleCache = createStyleCache()
  const styledItems: Ref<StyledItem>[] = []

  const faces = box.mesh!.triangles!.map((triangle) => {
    const vertices = triangle.vertices.map((vertex) => {
      const rotated = rotatePoint3(vertex, box.rotation)
      const translated = {
        x: rotated.x + box.center.x,
        y: rotated.z + box.center.z,
        z: rotated.y + box.center.y,
      }
      return createVertex(repo, translated)
    })

    const face = createFaceFromVertices(repo, vertices)
    const faceColor = normalizeTriangleColor(triangle.color)
    if (faceColor) {
      styledItems.push(createStyledItem(repo, face, faceColor, styleCache))
    }
    return face
  })

  const shell = repo.add(new ClosedShell("", faces))
  return {
    solid: repo.add(new ManifoldSolidBrep(box.label ?? "Component", shell)),
    styledItems,
    usesIntrinsicFaceStyles:
      faces.length > 0 && styledItems.length === faces.length,
    styleTargets: [],
  }
}

function normalizeTriangleColor(
  color: TriangleColor,
): [number, number, number] | null {
  if (!Array.isArray(color) || color.length < 3) return null

  const scale = color.some((value: number) => value > 1) ? 255 : 1
  return [
    clampColorChannel(color[0]! / scale),
    clampColorChannel(color[1]! / scale),
    clampColorChannel(color[2]! / scale),
  ]
}

function clampColorChannel(value: number): number {
  return Math.max(0, Math.min(1, value))
}
