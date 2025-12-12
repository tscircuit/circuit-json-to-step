import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["lib/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: false,
  clean: true,
  external: ["fs", "path", "url", "node:fs", "node:path", "node:url"],
})
