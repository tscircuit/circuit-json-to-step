import { createUint8Bitmap, encodePNG, renderDrawCalls } from "poppygl"
import type { ShellFace } from "./read-board-shell"

type View = {
  camPos: [number, number, number]
  lookAt: [number, number, number]
}

/**
 * Render each face with the winding its STEP loop gives it, the way a reader
 * that trusts the file does. Back faces are culled, so a face whose loop runs
 * against its outward normal disappears instead of being silently repaired.
 * Fan triangulation is enough for the convex faces of a rectangular board.
 *
 * The views are drawn side by side, e.g. from above and from below.
 */
export async function renderWoundShell(faces: ShellFace[], views: View[]) {
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  for (const { loop } of faces) {
    // Newell normal: points the way the loop winds counter-clockwise.
    const n = [0, 0, 0]
    loop.forEach((p, i) => {
      const q = loop[(i + 1) % loop.length]!
      n[0] += (p.y - q.y) * (p.z + q.z)
      n[1] += (p.z - q.z) * (p.x + q.x)
      n[2] += (p.x - q.x) * (p.y + q.y)
    })
    const length = Math.hypot(...n)
    const base = positions.length / 3
    for (const p of loop) {
      positions.push(p.x, p.y, p.z)
      normals.push(...n.map((v) => v / length))
    }
    for (let i = 1; i < loop.length - 1; i++) {
      indices.push(base, base + i, base + i + 1)
    }
  }
  const drawCall = {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: null,
    indices: new Uint32Array(indices),
    model: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
    material: {
      baseColorFactor: [0.82, 0.82, 0.82, 1] as [
        number,
        number,
        number,
        number,
      ],
      baseColorTexture: null,
    },
  }

  const panelWidth = 400
  const height = 400
  const out = createUint8Bitmap(panelWidth * views.length, height)
  views.forEach((view, index) => {
    const { bitmap } = renderDrawCalls(
      [drawCall],
      { width: panelWidth, height, cull: true, fov: 50, ...view },
      createUint8Bitmap,
    )
    for (let y = 0; y < height; y++) {
      const row = y * panelWidth * 4
      out.data.set(
        bitmap.data.subarray(row, row + panelWidth * 4),
        (y * out.width + index * panelWidth) * 4,
      )
    }
  })
  return encodePNG(out)
}
