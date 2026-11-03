import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "../../../lib"
import { importStepWithOcct } from "../../utils/occt/importer"
import { renderPadHoleSnapshot } from "./render-pad-hole-snapshot"
import fixture from "./basics24.json"

test("basics24: round drill in an oval pad fails STEP export; slot/circle controls import", async () => {
  const circuitJson = fixture as CircuitJson
  await expect(
    circuitJsonToStep(circuitJson, { exportMode: "pcb" }),
  ).rejects.toThrow("STEP real must be finite")
  const controls = circuitJson.filter(
    (element) =>
      element.type !== "pcb_plated_hole" ||
      element.pcb_plated_hole_id !== "round_pill",
  )
  const step = await circuitJsonToStep(controls, { exportMode: "pcb" })
  expect((await importStepWithOcct(step)).meshes).toHaveLength(1)
  await expect(
    await renderPadHoleSnapshot({ stepText: step, stage: "before" }),
  ).toMatchPngSnapshot(import.meta.path, "basics24")
}, 30_000)
