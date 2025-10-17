import { readFileSync } from "fs"

/**
 * Fetches a STEP file from a URL or local path
 * @param url - The URL or local file path to fetch
 * @returns The STEP file content as a string
 */
export async function fetchStepFile(url: string): Promise<string> {
  // Check if it's a local file path
  if (url.startsWith("file://") || url.startsWith("/") || url.startsWith("./")) {
    // Local file
    const filePath = url.startsWith("file://") ? url.slice(7) : url
    try {
      return readFileSync(filePath, "utf-8")
    } catch (error) {
      throw new Error(`Failed to read local STEP file: ${filePath}. Error: ${error}`)
    }
  }

  // Remote URL - fetch it
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    return await response.text()
  } catch (error) {
    throw new Error(`Failed to fetch STEP file from ${url}. Error: ${error}`)
  }
}
