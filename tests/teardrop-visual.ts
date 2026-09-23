import assert from "node:assert/strict"
import { readFile, writeFile } from "node:fs/promises"
import { createServer } from "vite"
import { chromium } from "playwright"
import { PNG } from "pngjs"
import pixelmatch from "pixelmatch"

// Small standalone GPU test: one browser, one 800x600 canvas, no large-board benchmark.
const server = await createServer({
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
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {}),
    args: [
      "--enable-unsafe-webgpu",
      ...(process.env.WEBGPU_SOFTWARE
        ? [
            "--enable-gpu",
            "--use-angle=swiftshader",
            "--use-vulkan=swiftshader",
            "--enable-features=Vulkan",
            "--enable-unsafe-swiftshader",
            "--ignore-gpu-blocklist",
          ]
        : []),
    ],
  })
  const page = await browser.newPage({
    viewport: { width: 900, height: 800 },
    deviceScaleFactor: 1,
  })
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto(server.resolvedUrls!.local[0]!)
  await page.waitForFunction(() => window.gpuTest, null, { timeout: 30000 })
  const result = await page.evaluate(() =>
    window.gpuTest.renderFixture("teardrops"),
  )
  assert.deepEqual(result.diagnostics, [])
  const actual = await page.locator("canvas").screenshot()
  const file = new URL("./snapshots/teardrops.png", import.meta.url)
  if (process.env.UPDATE_SNAPSHOTS) await writeFile(file, actual)
  else {
    const a = PNG.sync.read(actual),
      b = PNG.sync.read(await readFile(file))
    assert.equal(a.width, b.width)
    assert.equal(a.height, b.height)
    const changed = pixelmatch(a.data, b.data, undefined, a.width, a.height, {
      threshold: 0.1,
    })
    assert(changed < a.width * a.height * 0.002, `${changed} changed pixels`)
  }
  // The demo explicitly hides copper pours; teardrops must remain visible.
  const png = PNG.sync.read(actual)
  let copperPixels = 0
  for (let i = 0; i < png.data.length; i += 4)
    if (png.data[i]! > 150 && png.data[i + 1]! < 100) copperPixels++
  assert(
    copperPixels > 1000,
    "Expected visible trace copper with pours disabled",
  )
  assert.deepEqual(errors, [])
  console.log("Teardrop WebGPU snapshot passed")
} finally {
  await browser?.close()
  await server.close()
}
