import { expect, test } from "bun:test"
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs"
import { PNG } from "pngjs"
import aliases from "./parity/snapshot-aliases.json"
import { featureSnapshot } from "./parity/snapshot"
import { snapshotKey } from "./parity/snapshot-key"
import coverage from "./snapshots/features/coverage.json"

const baselineDir = new URL("./snapshots/features/", import.meta.url)

test("every captured comparison retains a baseline after deduplication", () => {
  const occurrence = new Map<string, number>()
  const shared: Record<string, string> = aliases
  for (const entry of coverage.entries) {
    const testKey = JSON.stringify([entry.path, entry.test])
    const ordinal = occurrence.get(testKey) ?? 0
    occurrence.set(testKey, ordinal + 1)
    if (!entry.file) continue
    const key = snapshotKey(entry.path, entry.test, ordinal)
    expect(entry.file).toBe(`${shared[key] ?? key}.png`)
    expect(existsSync(new URL(entry.file, baselineDir))).toBe(true)
  }
  for (const target of Object.values(shared)) {
    expect(shared[target]).toBeUndefined()
    expect(existsSync(new URL(`${target}.png`, baselineDir))).toBe(true)
  }
})

test("shared snapshots reject changed output and updates do not overwrite other cases", async () => {
  const [key, target] = Object.entries(aliases)[0]
  const own = new URL(`${key}.png`, baselineDir)
  const shared = new URL(`${target}.png`, baselineDir)
  const original = readFileSync(shared)
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
    expect(readFileSync(shared)).toEqual(original)
    expect(existsSync(own)).toBe(true)
    expect((await featureSnapshot("alias-own", svg, gpu, key)).pass).toBe(true)
  } finally {
    if (update === undefined) delete process.env.UPDATE_SNAPSHOTS
    else process.env.UPDATE_SNAPSHOTS = update
    rmSync(own, { force: true })
  }
})
