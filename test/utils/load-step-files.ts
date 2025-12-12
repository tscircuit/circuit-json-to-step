/**
 * Test utility for loading local STEP files.
 * This file uses Node APIs and should only be imported in tests, not in lib.
 */
import { readFile } from "node:fs/promises"

type CadComponent = {
  type: string
  model_step_url?: string
}

function isFilePath(value: string): boolean {
  return !/^https?:\/\//i.test(value)
}

/**
 * Loads all local STEP files referenced by cad_components in circuit JSON.
 * Returns a map of file path to file content.
 */
export async function loadStepFilesFromCircuitJson(
  circuitJson: unknown[],
): Promise<Record<string, string>> {
  const stepContents: Record<string, string> = {}
  const stepFilePaths = new Set<string>()

  for (const item of circuitJson as CadComponent[]) {
    if (
      item?.type === "cad_component" &&
      item.model_step_url &&
      isFilePath(item.model_step_url)
    ) {
      stepFilePaths.add(item.model_step_url)
    }
  }

  for (const filePath of stepFilePaths) {
    stepContents[filePath] = await readFile(filePath, "utf8")
  }

  return stepContents
}
