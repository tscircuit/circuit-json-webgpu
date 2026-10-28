import { mkdir, readFile, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { PNG } from "pngjs"
import { Resvg } from "@resvg/resvg-js"
import { compare } from "./compare"
import type coverage from "../snapshots/features/coverage.json"
// New and updated baselines are bundled; unchanged PNGs remain in place.
// The archive is copied with the harness for the base audit.
const bundled = await new Bun.Archive(
  await readFile(new URL("./snapshot-baselines.tar.gz", import.meta.url)),
).files()
export const snapshotAliases: Record<string, string> = JSON.parse(
  await bundled.get("aliases.json")!.text(),
)
export const snapshotCoverage: typeof coverage = JSON.parse(
  await bundled.get("coverage.json")!.text(),
)
const originalHashes: Record<string, string> = JSON.parse(
  await bundled.get("original-hashes.json")!.text(),
)
const baselineDir = new URL("../snapshots/features/", import.meta.url)

function baselinePath(key: string) {
  const linux = new URL(`linux/${key}.png`, baselineDir)
  if (process.platform === "linux" && existsSync(linux)) return linux
  return new URL(`${key}.png`, baselineDir)
}

export async function readFeatureBaseline(key: string) {
  const own = baselinePath(key)
  const name = own.href.slice(baselineDir.href.length)
  const local = existsSync(own) ? await readFile(own) : undefined
  // A local snapshot update takes precedence. Only the unchanged old PNG is
  // replaced by its bundled revision, so edits are never silently ignored.
  if (
    local &&
    createHash("sha256").update(local).digest("hex") !== originalHashes[name]
  )
    return local
  const override = bundled.get(name)
  if (override) return Buffer.from(await override.arrayBuffer())
  const target = snapshotAliases[key] ?? key
  const file = bundled.get(`${target}.png`)
  if (file) return Buffer.from(await file.arrayBuffer())
  return readFile(new URL(`${target}.png`, baselineDir))
}

/** Resvg does not load CSS @font-face URLs; use the SVG's own bundled font. */
export function renderReferenceSvg(svg: string) {
  const font = svg.match(/data:font\/ttf;base64,([^'"\s)]+)/)?.[1]
  if (!font) throw new Error("SVG reference is missing its embedded font")
  const hash = createHash("sha256").update(font).digest("hex")
  const directory = new URL("../actual/parity/fonts/", import.meta.url)
  const path = fileURLToPath(new URL(`${hash}.ttf`, directory))
  if (!existsSync(path)) {
    mkdirSync(directory, { recursive: true })
    writeFileSync(path, Buffer.from(font, "base64"))
  }
  return new Resvg(svg, {
    font: {
      loadSystemFonts: false,
      fontFiles: [path],
      defaultFontFamily: "TscircuitAlphabet",
    },
  })
    .render()
    .asPng()
}

/** PNG baseline contains labeled, equally sized SVG-left / rendered-GPU-right panels. */
export async function featureSnapshot(
  id: string,
  svg: PNG,
  gpu: PNG,
  key: string,
) {
  const headerHeight = 32
  const pair = new PNG({
    width: svg.width * 2,
    height: svg.height + headerHeight,
  })
  const header = PNG.sync.read(
    new Resvg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${pair.width}" height="${headerHeight}"><rect width="100%" height="100%" fill="#222"/><g fill="white" font-family="sans-serif" font-size="14"><text x="8" y="22">circuit-to-svg</text><text x="${svg.width + 8}" y="22">circuit-json-webgpu</text></g></svg>`,
    )
      .render()
      .asPng(),
  )
  PNG.bitblt(header, pair, 0, 0, pair.width, headerHeight, 0, 0)
  PNG.bitblt(svg, pair, 0, 0, svg.width, svg.height, 0, headerHeight)
  PNG.bitblt(gpu, pair, 0, 0, gpu.width, gpu.height, svg.width, headerHeight)
  const buffer = PNG.sync.write(pair)
  await mkdir(baselineDir, { recursive: true })
  await writeFile(
    new URL(`../actual/parity/${id}.pair.png`, import.meta.url),
    buffer,
  )
  if (process.env.UPDATE_SNAPSHOTS) {
    // Give this case its own file when updating so a changed render cannot
    // overwrite the baseline used by other cases with identical old output.
    await writeFile(baselinePath(key), buffer)
    return { pass: true, updated: true }
  }
  try {
    const expected = PNG.sync.read(await readFeatureBaseline(key))
    if (expected.width !== pair.width || expected.height !== pair.height)
      return { pass: false, error: "Snapshot dimensions changed" }
    // Labels are fixed; only compare rendered panels to avoid OS font differences.
    const crop = (p: PNG) => {
      const out = new PNG({ width: p.width, height: p.height - headerHeight })
      PNG.bitblt(p, out, 0, headerHeight, out.width, out.height, 0, 0)
      return out
    }
    const a = crop(expected),
      b = crop(pair)
    const diff = new PNG({ width: a.width, height: a.height })
    const { changed } = compare(a, b, diff)
    const pass = changed <= Math.ceil(a.width * a.height * 0.002)
    if (!pass)
      await writeFile(
        new URL(`../actual/parity/${id}.snapshot-diff.png`, import.meta.url),
        PNG.sync.write(diff),
      )
    return { pass, changedPixels: changed }
  } catch (error) {
    return { pass: false, error: String(error) }
  }
}
