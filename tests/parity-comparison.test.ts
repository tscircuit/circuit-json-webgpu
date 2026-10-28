import { expect, test } from "bun:test"
import { PNG } from "pngjs"
import { compare, filtered } from "./parity/compare.ts"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import font from "@tscircuit/alphabet/base64font"
import {
  featureSnapshot,
  readFeatureBaseline,
  renderReferenceSvg,
  snapshotAliases as aliases,
  snapshotCoverage as coverage,
} from "./parity/snapshot"
import { snapshotKey } from "./parity/snapshot-key"
function image(rects: number[][]) {
  const p = new PNG({ width: 100, height: 100 })
  for (let i = 0; i < p.data.length; i += 4) p.data.set([26, 26, 26, 255], i)
  for (const [x, y, w, h, color = 240] of rects)
    for (let a = y; a < y + h; a++)
      for (let b = x; b < x + w; b++)
        p.data.set([color, color, color, 255], (a * 100 + b) * 4)
  return p
}
const label = [
  [25, 45, 3, 12],
  [35, 45, 3, 12],
  [45, 45, 3, 8],
  [45, 55, 3, 2],
]
const expected = image(label)
const changed = (rects: number[][]) =>
  compare(expected, image(rects), new PNG({ width: 100, height: 100 })).changed
// At this size the ink-relative allowance is four pixels. These regressions
// must fail even after cross-backend antialias filtering.
test("parity comparison rejects missing labels and punctuation", () => {
  expect(changed([])).toBeGreaterThan(4)
  expect(changed(label.slice(0, 3))).toBeGreaterThan(4)
  expect(changed(label.slice(0, 2).concat([label[3]]))).toBeGreaterThan(4)
})
test("parity comparison rejects shifted, compressed, and incorrectly colored ink", () => {
  expect(
    changed(label.map(([x, y, w, h]) => [x + 3, y, w, h])),
  ).toBeGreaterThan(4)
  expect(
    changed(
      label.map(([x, y, w, h]) => [Math.round(25 + (x - 25) * 0.7), y, w, h]),
    ),
  ).toBeGreaterThan(4)
  expect(changed(label.map((r) => [...r, 120]))).toBeGreaterThan(4)
})

test("feature snapshot names depend on test identity, not suite discovery order", async () => {
  const { snapshotKey } = await import("./parity/snapshot-key")
  const key = snapshotKey("tests/elements/pcb-hole.test.ts", "square hole", 0)
  snapshotKey("tests/elements/pcb-text.test.ts", "label", 0)
  expect(snapshotKey("tests/elements/pcb-hole.test.ts", "square hole", 0)).toBe(
    key,
  )
  expect(
    snapshotKey("tests/elements/pcb-hole.test.ts", "square hole", 1),
  ).not.toBe(key)
})

test("separable comparison filter matches the full 2D kernel byte-for-byte", () => {
  let seed = 42
  for (const [width, height] of [
    [1, 1],
    [1, 9],
    [9, 1],
    [2, 3],
    [17, 13],
  ]) {
    const image = new PNG({ width, height })
    for (let i = 0; i < image.data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      image.data[i] = seed >>> 24
    }
    const expected = new Uint8Array(image.data.length)
    const kernel = [
      [1, 4, 6, 4, 1],
      [4, 16, 24, 16, 4],
      [6, 24, 36, 24, 6],
      [4, 16, 24, 16, 4],
      [1, 4, 6, 4, 1],
    ]
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        for (let channel = 0; channel < 4; channel++) {
          let sum = 0
          for (let ky = 0; ky < 5; ky++)
            for (let kx = 0; kx < 5; kx++) {
              const sx = Math.max(0, Math.min(width - 1, x + kx - 2))
              const sy = Math.max(0, Math.min(height - 1, y + ky - 2))
              sum +=
                image.data[(sy * width + sx) * 4 + channel] * kernel[ky][kx]
            }
          expected[(y * width + x) * 4 + channel] = Math.round(sum / 256)
        }
    expect(filtered(image)).toEqual(expected)
  }
})

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="100">
  <style>@font-face {font-family: 'TscircuitAlphabet'; src: url('data:font/ttf;base64,${font}');}</style>
  <text x="10" y="70" font-size="48" font-family="TscircuitAlphabet" fill="white">ABC123</text>
</svg>`

test("SVG reference labels render with the embedded alphabet and no system fonts", () => {
  const png = renderReferenceSvg(svg)
  const image = PNG.sync.read(png)
  let ink = 0
  for (let i = 3; i < image.data.length; i += 4) if (image.data[i]) ink++
  expect(ink).toBeGreaterThan(100)
  expect(renderReferenceSvg(svg)).toEqual(png)
})

test("missing embedded fonts fail instead of using runner-dependent fallback fonts", () => {
  expect(() =>
    renderReferenceSvg(svg.replace(/<style>.*<\/style>/, "")),
  ).toThrow("SVG reference is missing its embedded font")
})

const baselineDir = new URL("./snapshots/features/", import.meta.url)

test("bundled revisions replace old PNGs while local edits take precedence", async () => {
  const key = "copper-pour-different-net-11c0e6bc861f"
  const path = new URL(`${key}.png`, baselineDir)
  const original = readFileSync(path)
  const revised = await readFeatureBaseline(key)
  expect(revised).not.toEqual(original)
  const edited = PNG.sync.read(revised)
  edited.data.set([255, 0, 255, 255], 0)
  const update = PNG.sync.write(edited)
  try {
    writeFileSync(path, update)
    expect((await readFeatureBaseline(key)).equals(update)).toBe(true)
  } finally {
    writeFileSync(path, original)
  }
})

test("every captured comparison retains a baseline after deduplication", async () => {
  const occurrence = new Map<string, number>()
  const shared: Record<string, string> = aliases
  for (const entry of coverage.entries) {
    const testKey = JSON.stringify([entry.path, entry.test])
    const ordinal = occurrence.get(testKey) ?? 0
    occurrence.set(testKey, ordinal + 1)
    if (!entry.file) continue
    const key = snapshotKey(entry.path, entry.test, ordinal)
    expect(entry.file).toBe(`${shared[key] ?? key}.png`)
    expect((await readFeatureBaseline(key)).length).toBeGreaterThan(0)
  }
  for (const target of Object.values(shared)) {
    expect(shared[target]).toBeUndefined()
    expect((await readFeatureBaseline(target)).length).toBeGreaterThan(0)
  }
})

test("shared snapshots reject changed output and updates do not overwrite other cases", async () => {
  const [key, target] = Object.entries(aliases)[0]
  const own = new URL(`${key}.png`, baselineDir)
  const original = await readFeatureBaseline(target)
  const pair = PNG.sync.read(original)
  const svg = new PNG({ width: pair.width / 2, height: pair.height - 32 })
  const gpu = new PNG({ width: svg.width, height: svg.height })
  PNG.bitblt(pair, svg, 0, 32, svg.width, svg.height, 0, 0)
  PNG.bitblt(pair, gpu, svg.width, 32, gpu.width, gpu.height, 0, 0)
  expect(existsSync(own)).toBe(false)
  mkdirSync(new URL("./actual/parity/", import.meta.url), { recursive: true })
  expect((await featureSnapshot("alias-match", svg, gpu, key)).pass).toBe(true)
  for (let i = 0; i < gpu.data.length; i += 4)
    gpu.data.set([255, 0, 255, 255], i)
  expect((await featureSnapshot("alias-changed", svg, gpu, key)).pass).toBe(
    false,
  )
  expect(
    (await featureSnapshot("alias-missing", svg, gpu, `${key}-missing`)).pass,
  ).toBe(false)

  const update = process.env.UPDATE_SNAPSHOTS
  try {
    process.env.UPDATE_SNAPSHOTS = "1"
    await featureSnapshot("alias-update", svg, gpu, key)
    delete process.env.UPDATE_SNAPSHOTS
    expect(await readFeatureBaseline(target)).toEqual(original)
    expect(existsSync(own)).toBe(true)
    expect((await featureSnapshot("alias-own", svg, gpu, key)).pass).toBe(true)
  } finally {
    if (update === undefined) delete process.env.UPDATE_SNAPSHOTS
    else process.env.UPDATE_SNAPSHOTS = update
    rmSync(own, { force: true })
  }
})
