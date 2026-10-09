import { expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Resvg } from "@resvg/resvg-js"
import { prepareSvgFontConfig } from "./parity/svg-note-font"

test.skipIf(process.platform !== "linux")(
  "base fontconfig and explicit head font options produce identical SVG outlines",
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "parity-font-"))
    try {
      const { config, options } = await prepareSvgFontConfig(directory)
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100"><text x="10" y="50" font-family="Arial, sans-serif" font-size="24">AgWi0129 AV</text></svg>`
      // Run the unchanged base renderer's constructor in a fresh process, just
      // as the CI workflow does, rather than supplying explicit head options.
      const base = Bun.spawnSync(
        [
          process.execPath,
          "-e",
          `import { Resvg } from "@resvg/resvg-js"; process.stdout.write(new Resvg(${JSON.stringify(svg)}).toString())`,
        ],
        { env: { ...process.env, FONTCONFIG_FILE: config } },
      )
      expect(base.exitCode).toBe(0)
      expect(base.stdout.toString()).toBe(new Resvg(svg, options).toString())
      expect(base.stdout.toString()).toContain("<path")
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  },
)
