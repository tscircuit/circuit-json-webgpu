import assert from "node:assert/strict"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { createCanvas } from "@napi-rs/canvas"
import pixelmatch from "pixelmatch"
import { PNG } from "pngjs"
import type { Page } from "playwright"
import { createServer } from "vite"
import { launchWebGpuBrowser } from "../scripts/lib/launch-webgpu-browser"
import { mirroredSilkscreenText } from "./fixtures/silkscreen-mirroring"

/** Compare handedness against an independent camera reflection of unmirrored text. */
export async function checkSilkscreenMirroring(page: Page) {
  const frames = await page.evaluate((text) => {
    const drawer = window.gpuTest.drawer
    const canvas = document.querySelector("canvas")!
    const original = { width: canvas.width, height: canvas.height }
    canvas.width = 320
    canvas.height = 240
    const draw = (is_mirrored: boolean, scaleX: number) => {
      drawer.drawElements([{ ...text, is_mirrored }], {
        transform: { a: scaleX, b: 0, c: 0, d: -40, e: 160, f: 120 },
        layers: ["top_silkscreen"],
        hiddenLayerOpacity: 0,
        background: [0, 0, 0, 1],
      })
      if (drawer.diagnostics.length)
        throw new Error(JSON.stringify(drawer.diagnostics))
      return canvas.toDataURL("image/png").split(",")[1]
    }
    try {
      return { expected: draw(false, -40), actual: draw(true, 40) }
    } finally {
      canvas.width = original.width
      canvas.height = original.height
    }
  }, mirroredSilkscreenText)
  const expected = PNG.sync.read(Buffer.from(frames.expected, "base64"))
  const actual = PNG.sync.read(Buffer.from(frames.actual, "base64"))
  const { width, height } = actual
  const changed = pixelmatch(
    expected.data,
    actual.data,
    undefined,
    width,
    height,
    { threshold: 0.1 },
  )
  const allowance = width * height * 0.002
  const passed = changed <= allowance
  const headerHeight = 60
  const pair = new PNG({ width: width * 2, height: height + headerHeight })
  const header = createCanvas(pair.width, headerHeight)
  const ctx = header.getContext("2d")
  ctx.fillStyle = "#161b22"
  ctx.fillRect(0, 0, header.width, header.height)
  ctx.font = "bold 16px sans-serif"
  ctx.fillStyle = passed ? "#80dc9c" : "#ff9292"
  ctx.fillText(`Top silkscreen mirroring: ${passed ? "PASS" : "FAIL"}`, 10, 22)
  ctx.font = "14px sans-serif"
  ctx.fillStyle = "white"
  ctx.fillText("Expected: reflected WebGPU control", 10, 47)
  ctx.fillText("Actual: is_mirrored = true", width + 10, 47)
  PNG.bitblt(
    PNG.sync.read(header.toBuffer("image/png")),
    pair,
    0,
    0,
    pair.width,
    headerHeight,
    0,
    0,
  )
  PNG.bitblt(expected, pair, 0, 0, width, height, 0, headerHeight)
  PNG.bitblt(actual, pair, 0, 0, width, height, width, headerHeight)
  const directory = new URL("./actual/", import.meta.url)
  const snapshot = new URL(
    "./snapshots/silkscreen-mirroring.png",
    import.meta.url,
  )
  await mkdir(directory, { recursive: true })
  const buffer = PNG.sync.write(pair)
  await writeFile(new URL("silkscreen-mirroring.png", directory), buffer)
  await writeFile(
    new URL("silkscreen-mirroring.json", directory),
    JSON.stringify({ changedPixels: changed, allowance, passed }, null, 2),
  )
  if (process.env.UPDATE_SNAPSHOTS) await writeFile(snapshot, buffer)
  const baseline = PNG.sync.read(await readFile(snapshot))
  assert.deepEqual([baseline.width, baseline.height], [pair.width, pair.height])
  // Compare the two rendered panels, excluding OS-dependent header fonts.
  const offset = width * 2 * headerHeight * 4
  const snapshotChanged = pixelmatch(
    baseline.data.subarray(offset),
    pair.data.subarray(offset),
    undefined,
    pair.width,
    height,
    { threshold: 0.1 },
  )
  assert(
    snapshotChanged <= width * 2 * height * 0.002,
    "Silkscreen mirroring snapshot changed",
  )
  console.log(
    `silkscreen mirroring: ${changed} differing pixels (${passed ? "PASS" : "FAIL"})`,
  )
  // Updating a baseline must never turn incorrect handedness into a passing test.
  assert(passed, "is_mirrored=true must match the reflected unmirrored control")
}

if (import.meta.main) {
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    server: {
      host: "127.0.0.1",
      port: 0,
      hmr: false,
      watch: { ignored: ["**/*"] },
    },
    logLevel: "error",
  })
  await server.listen()
  let browser
  try {
    browser = await launchWebGpuBrowser()
    const page = await browser.newPage()
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(server.resolvedUrls!.local[0])
    await page.waitForFunction(() => window.gpuTest)
    await checkSilkscreenMirroring(page)
    assert.deepEqual(errors, [])
  } finally {
    await browser?.close()
    await server.close()
  }
}
