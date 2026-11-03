import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"
import { Resvg } from "@resvg/resvg-js"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { circuitJsonToStep } from "../../../lib"
import "../../fixtures/png-matcher"
import { importStepWithOcct } from "../../utils/occt/importer"
import generatedCircuitJson from "./round-pill-hole.json"

// Full board source: https://tscircuit.com/gokul/lora-device (v0.1.6).
// round-pill-hole.json was generated from index.circuit.tsx with @tscircuit/core
// 0.0.2172: add <LoRaDevice /> to a Circuit, set schematicDisabled and
// pcbRoutingDisabled to true, await renderUntilSettled(), then getCircuitJson().
// The TSX is a source fixture; this test uses its stored output so Core and its
// rendering dependencies do not need to be added to this converter repository.
test("repro: the full LoRa board cannot export round pill drills to STEP", async () => {
  const circuitJson = generatedCircuitJson as CircuitJson
  const sourceComponents = circuitJson.filter(
    (element) => element.type === "source_component",
  )
  expect(sourceComponents).toHaveLength(58)
  const j2 = sourceComponents.find((component) => component.name === "J2")!
  const j2Pcb = circuitJson.find(
    (element) =>
      element.type === "pcb_component" &&
      element.source_component_id === j2.source_component_id,
  )!
  if (j2Pcb.type !== "pcb_component")
    throw new Error("Missing J2 PCB component")
  const j2RoundHoles = circuitJson
    .filter((element) => element.type === "pcb_plated_hole")
    .filter(
      (element) =>
        element.pcb_component_id === j2Pcb.pcb_component_id &&
        element.shape === "pill",
    )
  expect(j2RoundHoles).toHaveLength(2)
  for (const hole of j2RoundHoles) {
    expect(hole).toMatchObject({ hole_width: 0.75, hole_height: 0.75 })
  }
  const pin3Hole = j2RoundHoles.find((hole) => hole.port_hints?.includes("3"))!
  expect(pin3Hole).toBeDefined()
  const j2Pin3Fixture: CircuitJson = [
    circuitJson.find((element) => element.type === "pcb_board")!,
    pin3Hole,
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    width: 800,
    height: 1200,
    layer: "top",
  })
  // Use the same packaged font on macOS and Linux for stable silkscreen labels.
  const png = new Resvg(svg, {
    font: {
      loadSystemFonts: false,
      fontFiles: [
        fileURLToPath(
          new URL(
            "./TscircuitAlphabet.ttf",
            import.meta.resolve("@tscircuit/alphabet"),
          ),
        ),
      ],
      defaultFontFamily: "TscircuitAlphabet",
      sansSerifFamily: "TscircuitAlphabet",
    },
  })
    .render()
    .asPng()
  await expect(png).toMatchPngSnapshot(import.meta.path, "lora-device-input")

  // Preserve the original close-up, extracted from the same stored Circuit JSON.
  const holeSvg = convertCircuitJsonToPcbSvg(j2Pin3Fixture, {
    width: 560,
    height: 480,
    layer: "top",
    viewport: { minX: -19, minY: -9.2, maxX: -15, maxY: -5.8 },
  })
  await expect(new Resvg(holeSvg).render().asPng()).toMatchPngSnapshot(
    import.meta.path,
    "round-pill-hole-input",
  )

  // These assertions record the current bug, not the desired behavior. A fix
  // should replace them with successful STEP import and through-hole checks.
  await expect(circuitJsonToStep(circuitJson)).rejects.toThrow(
    "STEP real must be finite",
  )
  await expect(
    circuitJsonToStep(circuitJson, { exportMode: "pcb" }),
  ).rejects.toThrow("STEP real must be finite")

  // Control: the same generated pad exports when its round drill becomes a slot.
  await expect(
    circuitJsonToStep(j2Pin3Fixture, { exportMode: "pcb" }),
  ).rejects.toThrow("STEP real must be finite")
  const elongatedDrill: CircuitJson = j2Pin3Fixture.map((element) =>
    element.type === "pcb_plated_hole" && element.shape === "pill"
      ? { ...element, hole_height: 1.25 }
      : element,
  )
  const step = await circuitJsonToStep(elongatedDrill, { exportMode: "pcb" })
  const imported = await importStepWithOcct(step)
  expect(imported.success).toBe(true)
  expect(imported.meshes).toHaveLength(1)
}, 30_000)
