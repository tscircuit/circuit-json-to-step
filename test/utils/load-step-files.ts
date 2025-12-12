/**
 * Test utility for loading local STEP files.
 * This file uses Node APIs and should only be imported in tests, not in lib.
 */
import { readFile } from "node:fs/promises"

type CadComponent = {
  type: string
  model_step_url?: string
}

/**
 * Loads all STEP files referenced by cad_components in circuit JSON.
 * Returns a map of URL/path to file content.
 */
export async function loadStepFilesFromCircuitJson(
  circuitJson: unknown[],
): Promise<Record<string, string>> {
  const stepContents: Record<string, string> = {}
  const urls = new Set<string>()

  for (const item of circuitJson as CadComponent[]) {
    if (item?.type === "cad_component" && item.model_step_url) {
      urls.add(item.model_step_url)
    }
  }

  for (const url of urls) {
    // Skip HTTP URLs - those will be fetched by the lib
    if (/^https?:\/\//i.test(url)) continue

    // Load local file using Node
    stepContents[url] = await readFile(url, "utf8")
  }

  return stepContents
}
