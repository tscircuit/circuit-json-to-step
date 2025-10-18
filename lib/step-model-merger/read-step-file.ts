import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

export async function readStepFile(modelUrl: string): Promise<string> {
  if (/^https?:\/\//i.test(modelUrl)) {
    const globalFetch = (globalThis as any).fetch as
      | ((input: string, init?: unknown) => Promise<any>)
      | undefined
    if (!globalFetch) {
      throw new Error("fetch is not available in this environment")
    }
    const res = await globalFetch(modelUrl)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`)
    }
    return await res.text()
  }

  if (modelUrl.startsWith("file://")) {
    const filePath = fileURLToPath(modelUrl)
    return await fs.readFile(filePath, "utf8")
  }

  const resolvedPath = path.isAbsolute(modelUrl)
    ? modelUrl
    : path.resolve(process.cwd(), modelUrl)
  return await fs.readFile(resolvedPath, "utf8")
}
