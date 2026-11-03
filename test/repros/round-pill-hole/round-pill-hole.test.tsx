import { beforeAll, expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { circuitJsonToStep } from "../../../lib"
import "../../fixtures/png-matcher"
import { importStepWithOcct } from "../../utils/occt/importer"
import LoRaDevice from "./lora-device/index.circuit"

let circuitJson: CircuitJson
let j2Pin3Fixture: CircuitJson

beforeAll(async () => {
  const circuit = new Circuit()
  // Hole geometry is generated during PCB component rendering. Skip schematic
  // layout and trace routing; retain the complete board, footprints and nets.
  circuit.schematicDisabled = true
  circuit.pcbRoutingDisabled = true
  circuit.add(<LoRaDevice />)
  await circuit.renderUntilSettled()
  circuitJson = circuit.getCircuitJson()

  expect(circuit.db.source_component.list()).toHaveLength(58)
  const j2 = circuit.db.source_component.getWhere({ name: "J2" })!
  const j2Pcb = circuit.db.pcb_component.getWhere({
    source_component_id: j2.source_component_id,
  })!
  const j2RoundHoles = circuit.db.pcb_plated_hole
    .list()
    .filter(
      (hole) =>
        hole.pcb_component_id === j2Pcb.pcb_component_id &&
        hole.shape === "pill",
    )
  expect(j2RoundHoles).toHaveLength(2)
  for (const hole of j2RoundHoles) {
    expect(hole).toMatchObject({ hole_width: 0.75, hole_height: 0.75 })
  }
  const pin3Hole = j2RoundHoles.find((hole) => hole.port_hints?.includes("3"))!
  expect(pin3Hole).toBeDefined()
  j2Pin3Fixture = [circuit.db.pcb_board.list()[0]!, pin3Hole]
}, 30_000)

test("repro: the full LoRa board generated from TSX cannot export to STEP", async () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    width: 800,
    height: 1200,
    layer: "top",
  })
  await expect(new Resvg(svg).render().asPng()).toMatchPngSnapshot(
    import.meta.path,
    "lora-device-input",
  )

  // Preserve the original close-up, now extracted from Core's fresh output.
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
}, 30_000)

test("the generated J2 pad exports when its round drill becomes a slot", async () => {
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
})
