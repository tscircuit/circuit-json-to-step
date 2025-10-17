import { test, expect } from "bun:test"
import { circuitJsonToStep } from "../../lib/index"
import { importStepWithOcct } from "../utils/occt/importer"
import { readFileSync } from "fs"

test("step-merge01: merge external STEP file from model_step_url", async () => {
  // Create circuit JSON with a cad_component that has model_step_url
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_1",
      width: 50,
      height: 50,
      thickness: 1.6,
      center: { x: 0, y: 0 },
    },
    {
      type: "cad_component",
      cad_component_id: "cad_1",
      position: { x: 0, y: 0, z: 2 },
      rotation: { x: 0, y: 0, z: 0 },
      model_step_url: "./test/step-merge/fixtures/simple-box.step",
    },
  ] as any

  const stepText = await circuitJsonToStep(circuitJson, {
    boardWidth: 50,
    boardHeight: 50,
    boardThickness: 1.6,
    productName: "TestPCB_WithExternalSTEP",
    includeComponents: true,
    includeExternalMeshes: true,
  })

  // Verify STEP format
  expect(stepText).toContain("ISO-10303-21")
  expect(stepText).toContain("END-ISO-10303-21")

  // Verify product structure
  expect(stepText).toContain("TestPCB_WithExternalSTEP")
  expect(stepText).toContain("MANIFOLD_SOLID_BREP")

  // Count MANIFOLD_SOLID_BREP occurrences - should have at least 2 (board + external model)
  const solidCount = (stepText.match(/MANIFOLD_SOLID_BREP/g) || []).length
  expect(solidCount).toBeGreaterThanOrEqual(2)
  
  console.log(`✓ Found ${solidCount} solids (board + external STEP)`)

  // Write STEP file to debug-output
  const outputPath = "debug-output/step-merge01.step"
  await Bun.write(outputPath, stepText)

  console.log("✓ STEP file with merged external model generated successfully")
  console.log(`  - Solids created: ${solidCount}`)
  console.log(`  - STEP text length: ${stepText.length} bytes`)
  console.log(`  - Output: ${outputPath}`)

  // Validate STEP file can be imported with occt-import-js
  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)
  expect(occtResult.meshes.length).toBeGreaterThan(0)

  console.log(`✓ STEP file successfully validated with occt-import-js (${occtResult.meshes.length} meshes)`)
}, 30000)

test("step-merge02: test STEP fetching utility", async () => {
  const { fetchStepFile } = await import("../../lib/fetch-step-file")
  
  // Test fetching local file
  const stepContent = await fetchStepFile("./test/step-merge/fixtures/simple-box.step")
  
  expect(stepContent).toContain("ISO-10303-21")
  expect(stepContent).toContain("MANIFOLD_SOLID_BREP")
  expect(stepContent).toContain("END-ISO-10303-21")
  
  console.log("✓ Successfully fetched local STEP file")
}, 10000)

test("step-merge03: test STEP parsing", async () => {
  const { parseStepFile } = await import("../../lib/step-merging")
  
  const stepContent = readFileSync("./test/step-merge/fixtures/simple-box.step", "utf-8")
  const parsed = parseStepFile(stepContent)
  
  expect(parsed.entities.size).toBeGreaterThan(0)
  expect(parsed.header).toBeTruthy()
  
  console.log(`✓ Parsed ${parsed.entities.size} entities from STEP file`)
}, 10000)

test("step-merge04: test coordinate transformation", async () => {
  // Create circuit JSON with transformed component
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_1",
      width: 50,
      height: 50,
      thickness: 1.6,
      center: { x: 0, y: 0 },
    },
    {
      type: "cad_component",
      cad_component_id: "cad_1",
      position: { x: 20, y: 10, z: 5 }, // Translated position
      rotation: { x: 0, y: 0, z: 45 }, // 45 degree rotation around Z
      model_step_url: "./test/step-merge/fixtures/simple-box.step",
      model_unit_to_mm_scale_factor: 0.5, // Scaled to 50%
    },
  ] as any

  const stepText = await circuitJsonToStep(circuitJson, {
    boardWidth: 50,
    boardHeight: 50,
    boardThickness: 1.6,
    productName: "TestPCB_WithTransform",
    includeComponents: true,
    includeExternalMeshes: true,
  })

  // Verify STEP format
  expect(stepText).toContain("ISO-10303-21")
  expect(stepText).toContain("MANIFOLD_SOLID_BREP")

  const solidCount = (stepText.match(/MANIFOLD_SOLID_BREP/g) || []).length
  expect(solidCount).toBeGreaterThanOrEqual(2)

  // Write STEP file to debug-output
  const outputPath = "debug-output/step-merge04.step"
  await Bun.write(outputPath, stepText)

  console.log("✓ STEP file with transformed external model generated successfully")
  console.log(`  - Output: ${outputPath}`)

  // Validate with occt
  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)
  
  console.log(`✓ Transformed STEP file validated successfully`)
}, 30000)
