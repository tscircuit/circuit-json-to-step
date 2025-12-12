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

  const fs = await import("node:fs/promises")
  const path = await import("node:path")
  if (modelUrl.startsWith("file://")) {
    const { fileURLToPath } = await import("node:url")
    const filePath = fileURLToPath(modelUrl)
    return await fs.readFile(filePath, "utf8")
  }

  const resolvedPath = path.isAbsolute(modelUrl)
    ? modelUrl
    : path.resolve(process.cwd(), modelUrl)
  return await fs.readFile(resolvedPath, "utf8")
}
