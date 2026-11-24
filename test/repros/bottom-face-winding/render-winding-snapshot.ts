import { Resvg, initWasm } from "@resvg/resvg-wasm"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import type { inspectBoardCaps } from "./inspect-board-caps"

type Inspection = ReturnType<typeof inspectBoardCaps>

// Use the same renderer and font bytes on macOS and Linux snapshot runners.
const wasmReady = initWasm(
  readFileSync(new URL(import.meta.resolve("@resvg/resvg-wasm/index_bg.wasm"))),
)
const font = readFileSync(
  fileURLToPath(
    new URL(
      "./TscircuitAlphabet.ttf",
      import.meta.resolve("@tscircuit/alphabet"),
    ),
  ),
)

/** The arrows come from STEP edge traversal, not a healed/tessellated model. */
export async function renderWindingSnapshot({
  caps,
  inconsistentEdges,
}: Inspection) {
  await wasmReady
  const panels = caps
    .map((cap, index) => {
      const cx = 200 + index * 400
      const points = cap.points.map((p) => [cx + p.x * 6, 235 - p.y * 6])
      const color = cap.signedArea * cap.normalZ > 0 ? "#16803c" : "#d32f2f"
      const arrows = points
        .map(([x, y], i) => {
          const [nx, ny] = points[(i + 1) % points.length]
          const dx = nx - x,
            dy = ny - y
          const length = Math.hypot(dx, dy)
          const ux = dx / length,
            uy = dy / length
          const mx = (x + nx) / 2,
            my = (y + ny) / 2
          return `<polygon fill="${color}" points="${mx + ux * 10},${my + uy * 10} ${mx - ux * 7 - uy * 6},${my - uy * 7 + ux * 6} ${mx - ux * 7 + uy * 6},${my - uy * 7 - ux * 6}" />`
        })
        .join("")
      return `<text x="${cx}" y="108" text-anchor="middle" font-size="20">${index === 0 ? "Top" : "Bottom"}: normal ${cap.normalZ > 0 ? "+Z" : "-Z"}</text>
      <polygon points="${points.map((p) => p.join(",")).join(" ")}" fill="#f1f5f9" stroke="${color}" stroke-width="3" />${arrows}
      <text x="${cx}" y="375" text-anchor="middle" font-size="18" fill="${color}">XY signed area: ${cap.signedArea} mm2</text>
      <text x="${cx}" y="405" text-anchor="middle" font-size="18" fill="${color}">${cap.signedArea * cap.normalZ > 0 ? "Consistent with normal" : "Opposes outward normal"}</text>`
    })
    .join("")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480">
    <rect width="800" height="480" fill="white" />
    <g font-family="TscircuitAlphabet" fill="#172033">
      <text x="400" y="36" text-anchor="middle" font-size="24">STEP board boundary winding</text>
      <text x="400" y="65" text-anchor="middle" font-size="16">Both caps viewed from +Z; arrows follow exported edges</text>
      ${panels}
      <text x="400" y="453" text-anchor="middle" font-size="18">Inconsistent shared perimeter edges: ${inconsistentEdges}</text>
    </g>
  </svg>`
  const renderer = new Resvg(svg, {
    font: { fontBuffers: [font], defaultFontFamily: "TscircuitAlphabet" },
  })
  const image = renderer.render()
  try {
    return image.asPng()
  } finally {
    image.free()
    renderer.free()
  }
}
