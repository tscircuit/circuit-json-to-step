/**
 * Fetches STEP file content from an HTTP(S) URL.
 * For local files, the caller must read the file and pass the content directly.
 */
export async function readStepFile(modelUrl: string): Promise<string> {
  if (!/^https?:\/\//i.test(modelUrl)) {
    throw new Error(
      `Only HTTP(S) URLs are supported. For local files, read the file content and pass it directly. Received: ${modelUrl}`,
    )
  }

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
