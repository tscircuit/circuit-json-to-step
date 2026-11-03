import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { circuitJsonToStep } from "../../../lib"
import "../../fixtures/png-matcher"
import { importStepWithOcct } from "../../utils/occt/importer"
import fixture from "./round-pill-hole.json"

// Extracted from gokul/lora-device v0.1.6 (https://tscircuit.com/gokul/lora-device).
// J2 pin 3 has an oval copper pad around a round 0.75 mm drill. Preserve its
// generated shape="pill", dimensions and position; only unrelated records and
// board design rules were removed. Core version: 0.0.2172.
const circuitJson = fixture as CircuitJson

test("repro: J2's round pill drill prevents STEP export", async () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    width: 560,
    height: 480,
    layer: "top",
    viewport: { minX: -19, minY: -9.2, maxX: -15, maxY: -5.8 },
  })
  const png = new Resvg(svg).render().asPng()
  await expect(png).toMatchPngSnapshot(
    import.meta.path,
    "round-pill-hole-input",
  )

  // Capture the current bug, not the desired behavior. A fix should replace
  // these rejection assertions with an OCCT import and through-hole checks.
  // Both the default website export and the board-only path fail before any
  // external component models are involved.
  await expect(circuitJsonToStep(circuitJson)).rejects.toThrow(
    "STEP real must be finite",
  )
  await expect(
    circuitJsonToStep(circuitJson, { exportMode: "pcb" }),
  ).rejects.toThrow("STEP real must be finite")
})

test("the same pad with an elongated pill drill exports successfully", async () => {
  const elongatedDrill: CircuitJson = circuitJson.map((element) =>
    element.type === "pcb_plated_hole" && element.shape === "pill"
      ? { ...element, hole_height: 1.25 }
      : element,
  )
  const step = await circuitJsonToStep(elongatedDrill, { exportMode: "pcb" })
  const imported = await importStepWithOcct(step)
  expect(imported.success).toBe(true)
  expect(imported.meshes).toHaveLength(1)
})
