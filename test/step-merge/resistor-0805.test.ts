import { test, expect } from "bun:test"
import { circuitJsonToStep } from "../../lib/index"
import "../fixtures/step-snapshot" // Register the custom matcher
import path from "path"

test("real-world-01: 0805 resistor with KiCad STEP model", async () => {
  // Use a real KiCad STEP model URL for 0805 resistor
  // KiCad models are hosted on GitLab
  const kicadStepUrl = "https://gitlab.com/kicad/libraries/kicad-packages3D/-/raw/master/Resistor_SMD.3dshapes/R_0805_2012Metric.step"
  
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_1",
      width: 8,
      height: 6,
      thickness: 1.6,
      center: { x: 0, y: 0 },
    },
    {
      type: "source_component",
      source_component_id: "R1",
      name: "R1",
      ftype: "simple_resistor",
      resistance: "10k",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_R1",
      source_component_id: "R1",
      center: { x: 0, y: 0 },
      layer: "top",
      rotation: 0,
      width: 2,
      height: 1.25,
    },
    {
      type: "cad_component",
      cad_component_id: "cad_R1",
      pcb_component_id: "pcb_R1",
      position: { x: 0, y: 0, z: 1.6 }, // On top of board
      rotation: { x: 0, y: 0, z: 0 },
      model_step_url: kicadStepUrl,
      model_unit_to_mm_scale_factor: 1.0, // KiCad models are in mm
    },
  ] as any

  console.log("Generating STEP with real KiCad 0805 resistor model...")
  console.log(`  Model URL: ${kicadStepUrl}`)

  const stepText = await circuitJsonToStep(circuitJson, {
    boardWidth: 8,
    boardHeight: 6,
    boardThickness: 1.6,
    productName: "TestPCB_With_0805_Resistor",
    includeComponents: true,
    includeExternalMeshes: true,
  })

  // Verify STEP format
  expect(stepText).toContain("ISO-10303-21")
  expect(stepText).toContain("END-ISO-10303-21")
  expect(stepText).toContain("MANIFOLD_SOLID_BREP")

  // Count solids - should have board + resistor
  const solidCount = (stepText.match(/MANIFOLD_SOLID_BREP/g) || []).length
  expect(solidCount).toBeGreaterThanOrEqual(2)

  console.log(`✓ Generated STEP with ${solidCount} solids`)

  // Write output for visual inspection
  const outputPath = path.join(__dirname, "../../debug-output/real-world-resistor-0805.step")
  await Bun.write(outputPath, stepText)
  console.log(`✓ Output written to: ${outputPath}`)

  // Visual snapshot test using custom matcher
  await expect(stepText).toMatchStepSnapshot(import.meta.path, "resistor-0805")
}, 60000) // 60 second timeout for network fetch
