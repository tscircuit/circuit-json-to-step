import { expect, test } from "bun:test"
import { renderGLTFToPNGBufferFromGLBBuffer } from "poppygl"
import { circuitJsonToStep } from "../../../lib/index"
import { importStepWithOcct } from "../../utils/occt/importer"
import circuitJson from "./repro02.json"

test("repro02: convert circuit json with rotated pill holes to STEP", async () => {
  const stepText = await circuitJsonToStep(circuitJson as any, {
    includeComponents: true,
    productName: "Repro02",
  })

  const gltfModule = "circuit-json-to-gltf"
  const { convertCircuitJsonTo3D, convertSceneToGLTF } = await import(
    /* @vite-ignore */ gltfModule
  )
  const scene3d = await convertCircuitJsonTo3D(circuitJson as any, {
    renderBoardTextures: false,
    showBoundingBoxes: false,
  })
  const glb = await convertSceneToGLTF(scene3d, { binary: true })
  expect(glb).toBeInstanceOf(ArrayBuffer)
  expect((glb as ArrayBuffer).byteLength).toBeGreaterThan(0)

  const cameraOptions = scene3d.camera
    ? {
        camPos: [
          scene3d.camera.position.x,
          scene3d.camera.position.y,
          scene3d.camera.position.z,
        ] as const,
        lookAt: [
          scene3d.camera.target.x,
          scene3d.camera.target.y,
          scene3d.camera.target.z,
        ] as const,
        fov: scene3d.camera.fov ?? 60,
      }
    : undefined
  const gltfPng = await renderGLTFToPNGBufferFromGLBBuffer(
    glb as ArrayBuffer,
    cameraOptions,
  )
  await expect(gltfPng).toMatchPngSnapshot(import.meta.path, "repro02-gltf")

  // Verify STEP format
  expect(stepText).toContain("ISO-10303-21")
  expect(stepText).toContain("END-ISO-10303-21")

  // Verify product structure
  expect(stepText).toContain("Repro02")
  expect(stepText).toContain("MANIFOLD_SOLID_BREP")

  // Verify holes are created
  expect(stepText).toContain("CIRCLE")
  expect(stepText).toContain("CYLINDRICAL_SURFACE")

  // Write STEP file to debug-output
  const outputPath = "debug-output/repro02.step"
  await Bun.write(outputPath, stepText)

  console.log("✓ STEP file generated successfully")
  console.log(`  - STEP text length: ${stepText.length} bytes`)
  console.log(`  - Output: ${outputPath}`)

  // Validate STEP file can be imported with occt-import-js
  const occtResult = await importStepWithOcct(stepText)
  expect(occtResult.success).toBe(true)
  expect(occtResult.meshes.length).toBeGreaterThan(0)

  const [firstMesh] = occtResult.meshes
  expect(firstMesh.attributes.position.array.length).toBeGreaterThan(0)
  expect(firstMesh.index.array.length).toBeGreaterThan(0)

  console.log("✓ STEP file successfully validated with occt-import-js")

  await expect(stepText).toMatchStepSnapshot(import.meta.path, "repro02")
}, 30000)
