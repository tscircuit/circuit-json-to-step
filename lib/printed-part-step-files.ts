import type { CircuitJson } from "circuit-json"
import { circuitJsonToAssemblyStep } from "./assembly"

/** Export one STEP file per printed part, excluding PCBs and other assembly parts. */
export function circuitJsonToPrintedPartStepFiles(
  circuitJson: CircuitJson,
): Record<string, string> {
  const parts = circuitJson.filter(
    (item) => item.type === "source_component" && item.ftype === "printedpart",
  )
  if (parts.length === 0) {
    throw new Error("No assembly.printedpart elements found to export")
  }

  const files: Record<string, string> = {}
  const usedNames = new Set<string>()
  for (const part of parts) {
    const baseName =
      part.name.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") ||
      "printed-part"
    let fileName = `${baseName}.step`
    let suffix = 2
    while (usedNames.has(fileName.toLowerCase())) {
      fileName = `${baseName}-${suffix++}.step`
    }
    usedNames.add(fileName.toLowerCase())
    files[fileName] = circuitJsonToAssemblyStep(circuitJson, {
      productName: part.name,
      sourceComponentId: part.source_component_id,
    })
  }
  return files
}
