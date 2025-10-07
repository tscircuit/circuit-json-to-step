import { expect } from "bun:test"
import * as fs from "node:fs"
import * as path from "node:path"
import looksSame from "looks-same"

const DEFAULT_DIFF_PERCENTAGE = Number(
  process.env["PNG_SNAPSHOT_DIFF_PERCENTAGE"] ?? 0.5,
)

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function resolveSnapshotPath(
  testPathOriginal: string,
  pngName?: string,
): { snapshotDir: string; filePath: string; baseName: string } {
  const dirname = path.dirname(testPathOriginal)
  const snapshotDir = path.join(dirname, "__snapshots__")
  const baseName =
    pngName ??
    path
      .basename(testPathOriginal)
      .replace(/\.(test|spec)\.[mc]?[tj]sx?$/i, "")
  const filePath = path.join(snapshotDir, `${baseName}.snap.png`)
  return { snapshotDir, filePath, baseName }
}

async function toMatchPngSnapshot(
  // biome-ignore lint/suspicious/noExplicitAny: Bun matcher context
  this: any,
  received: Uint8Array | Buffer | ArrayBuffer,
  testPathOriginal: string,
  pngName?: string,
) {
  const buf =
    received instanceof Uint8Array
      ? Buffer.from(received)
      : received instanceof ArrayBuffer
        ? Buffer.from(new Uint8Array(received))
        : Buffer.from(received)

  const { snapshotDir, filePath, baseName } = resolveSnapshotPath(
    testPathOriginal,
    pngName,
  )
  ensureDir(snapshotDir)

  const shouldUpdate =
    process.env["BUN_UPDATE_SNAPSHOTS"] === "1" ||
    process.env["BUN_UPDATE_SNAPSHOTS"] === "true"

  if (!fs.existsSync(filePath)) {
    if (shouldUpdate) {
      fs.writeFileSync(filePath, buf)
      return {
        message: () => `PNG snapshot created: ${path.relative(process.cwd(), filePath)}`,
        pass: true,
      }
    }
    return {
      message: () =>
        `PNG snapshot missing for "${baseName}".\nCreate it by running: BUN_UPDATE_SNAPSHOTS=1 bun test`,
      pass: false,
    }
  }

  const existingSnapshot = fs.readFileSync(filePath)

  const strict =
    process.env["PNG_SNAPSHOT_STRICT"] === "1" ||
    process.env["CI"] === "true" ||
    process.env["CI"] === "1"
  const tolerance = Number(process.env["PNG_SNAPSHOT_TOLERANCE"] ?? 5)
  const antialiasingTolerance = Number(
    process.env["PNG_SNAPSHOT_AA_TOLERANCE"] ?? 4,
  )

  const result: any = await looksSame(Buffer.from(buf), existingSnapshot, {
    strict,
    tolerance,
    antialiasingTolerance,
    ignoreCaret: true,
    shouldCluster: true,
    clustersSize: 10,
  })

  if (result.equal) {
    return {
      message: () => "PNG snapshot matches",
      pass: true,
    }
  }

  // Compute diff percentage when possible
  let diffPercentage = 100
  if (result.diffBounds && typeof result.diffBounds !== "boolean") {
    const { left, top, right, bottom } = result.diffBounds
    const diffWidth = Math.max(0, right - left)
    const diffHeight = Math.max(0, bottom - top)
    // Rough estimate, not exact pixel count, but good signal
    const diffArea = diffWidth * diffHeight
    // Use received dimensions if available from result, otherwise fallback
    const width = result.width ?? 800
    const height = result.height ?? 600
    const totalArea = width * height
    diffPercentage = (diffArea / Math.max(1, totalArea)) * 100
  }

  if (shouldUpdate) {
    fs.writeFileSync(filePath, buf)
    return {
      message: () =>
        `PNG snapshot updated: ${path.relative(process.cwd(), filePath)}`,
      pass: true,
    }
  }

  const diffPath = filePath.replace(/\.snap\.png$/, ".diff.png")
  await looksSame.createDiff({
    reference: existingSnapshot,
    current: Buffer.from(buf),
    diff: diffPath,
    highlightColor: "#ff00ff",
    strict,
    tolerance,
    antialiasingTolerance,
  })

  const threshold = DEFAULT_DIFF_PERCENTAGE
  if (diffPercentage <= threshold) {
    return {
      message: () =>
        `PNG snapshot within tolerance: ${diffPercentage.toFixed(3)}% (<= ${threshold}%).`,
      pass: true,
    }
  }

  return {
    message: () =>
      `PNG snapshot differs by ${diffPercentage.toFixed(3)}% (threshold: ${threshold}%).\nDiff: ${diffPath}\nSet BUN_UPDATE_SNAPSHOTS=1 to update the snapshot.`,
    pass: false,
  }
}

expect.extend({
  toMatchPngSnapshot: toMatchPngSnapshot as any,
})

declare module "bun:test" {
  interface Matchers<T = unknown> {
    toMatchPngSnapshot(
      testPath: string,
      pngName?: string,
    ): Promise<import("bun:test").MatcherResult>
  }
}
