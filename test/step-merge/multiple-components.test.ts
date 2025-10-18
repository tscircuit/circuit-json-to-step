import { test, expect } from "bun:test"
import { circuitJsonToStep } from "../../lib/index"
import "../fixtures/step-snapshot"
import path from "path"

test("real-world-02: Multiple components with KiCad STEP models", async () => {
  // Test with multiple real KiCad STEP models
  const resistorUrl = "https://gitlab.com/kicad/libraries/kicad-packages3D/-/raw/master/Resistor_SMD.3dshapes/R_0805_2012Metric.step"
  const capacitorUrl = "https://gitlab.com/kicad/libraries/kicad-packages3D/-/raw/master/Capacitor_SMD.3dshapes/C_0805_2012Metric.step"
  
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_1",
      width: 15,
      height: 15,
      thickness: 1.6,
      center: { x: 0, y: 0 },
    },
    // Resistor R1
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
      center: { x: -4, y: 0 },
      layer: "top",
      rotation: 0,
      width: 2,
      height: 1.25,
    },
    {
      type: "cad_component",
      cad_component_id: "cad_R1",
      pcb_component_id: "pcb_R1",
      position: { x: -4, y: 0, z: 1.6 },
      rotation: { x: 0, y: 0, z: 0 },
      model_step_url: resistorUrl,
      model_unit_to_mm_scale_factor: 1.0,
    },
    // Capacitor C1
    {
      type: "source_component",
      source_component_id: "C1",
      name: "C1",
      ftype: "simple_capacitor",
      capacitance: "100nF",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_C1",
      source_component_id: "C1",
      center: { x: 4, y: 0 },
      layer: "top",
      rotation: 90,
      width: 2,
      height: 1.25,
    },
    {
      type: "cad_component",
      cad_component_id: "cad_C1",
      pcb_component_id: "pcb_C1",
      position: { x: 4, y: 0, z: 1.6 },
      rotation: { x: 0, y: 0, z: 90 }, // Rotated 90 degrees
      model_step_url: capacitorUrl,
      model_unit_to_mm_scale_factor: 1.0,
    },
    // Second resistor R2
    {
      type: "source_component",
      source_component_id: "R2",
      name: "R2",
      ftype: "simple_resistor",
      resistance: "1k",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_R2",
      source_component_id: "R2",
      center: { x: 0, y: 4 },
      layer: "top",
      rotation: 0,
      width: 2,
      height: 1.25,
    },
    {
      type: "cad_component",
      cad_component_id: "cad_R2",
      pcb_component_id: "pcb_R2",
      position: { x: 0, y: 4, z: 1.6 },
      rotation: { x: 0, y: 0, z: 0 },
      model_step_url: resistorUrl,
      model_unit_to_mm_scale_factor: 0.5, // Scaled to 50%
    },
  ] as any

  console.log("Generating STEP with multiple KiCad components...")
  console.log(`  R1: ${resistorUrl}`)
  console.log(`  C1: ${capacitorUrl}`)
  console.log(`  R2: ${resistorUrl} (scaled 0.5x)`)

  const stepText = await circuitJsonToStep(circuitJson, {
    boardWidth: 15,
    boardHeight: 15,
    boardThickness: 1.6,
    productName: "TestPCB_Multiple_Components",
    includeComponents: true,
    includeExternalMeshes: true,
  })

  // Verify STEP format
  expect(stepText).toContain("ISO-10303-21")
  expect(stepText).toContain("END-ISO-10303-21")

  // Count solids - should have board + 3 components
  const solidCount = (stepText.match(/MANIFOLD_SOLID_BREP/g) || []).length
  expect(solidCount).toBeGreaterThanOrEqual(4) // Board + R1 + C1 + R2

  console.log(`✓ Generated STEP with ${solidCount} solids`)

  // Write output
  const outputPath = path.join(__dirname, "../../debug-output/real-world-multiple-components.step")
  await Bun.write(outputPath, stepText)
  console.log(`✓ Output written to: ${outputPath}`)

  // Visual snapshot test
  await expect(stepText).toMatchStepSnapshot(import.meta.path, "multiple-components")
}, 120000) // 120 second timeout for multiple network fetches
