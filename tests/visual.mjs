import assert from "node:assert/strict"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { createServer } from "vite"
import { chromium } from "playwright"
import { PNG } from "pngjs"
import pixelmatch from "pixelmatch"

const root = fileURLToPath(new URL("../", import.meta.url))
const server = await createServer({
  root,
  server: { host: "127.0.0.1", port: 0 },
  logLevel: "error",
})
await server.listen()
let browser
try {
  browser = await chromium.launch({
    headless: !process.env.WEBGPU_SOFTWARE,
    args: [
      "--enable-unsafe-webgpu",
      ...(process.env.WEBGPU_SOFTWARE
        ? [
            "--enable-gpu",
            "--use-angle=vulkan",
            "--use-vulkan=swiftshader",
            "--enable-features=Vulkan,VulkanFromANGLE,DefaultANGLEVulkan",
            "--disable-vulkan-surface",
            "--use-webgpu-adapter=swiftshader",
          ]
        : []),
    ],
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {}),
  })
  const page = await browser.newPage({
    viewport: { width: 900, height: 800 },
    deviceScaleFactor: 1,
  })
  const errors = []
  page.on("pageerror", (e) => {
    errors.push(e.message)
    console.error(e.message)
  })
  page.on("console", (m) => {
    if (m.type() === "error") {
      errors.push(m.text())
      console.error(m.text())
    }
  })
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`)
  await page.waitForFunction(() => window.gpuTest, null, { timeout: 30000 })
  const names = await page.evaluate(() => window.gpuTest.names)
  await mkdir(new URL("./actual/", import.meta.url), { recursive: true })
  async function snapshot(name) {
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    )
    const buffer = await page.locator("canvas").screenshot()
    const file = new URL(`./snapshots/${name}.png`, import.meta.url)
    if (process.env.UPDATE_SNAPSHOTS) await writeFile(file, buffer)
    else {
      const expected = PNG.sync.read(await readFile(file)),
        actual = PNG.sync.read(buffer)
      assert.equal(actual.width, expected.width)
      assert.equal(actual.height, expected.height)
      const diff = new PNG({ width: actual.width, height: actual.height })
      const changed = pixelmatch(
        expected.data,
        actual.data,
        diff.data,
        actual.width,
        actual.height,
        { threshold: 0.1 },
      )
      if (changed > actual.width * actual.height * 0.002) {
        await writeFile(
          new URL(`./actual/${name}.png`, import.meta.url),
          buffer,
        )
        await writeFile(
          new URL(`./actual/${name}.diff.png`, import.meta.url),
          PNG.sync.write(diff),
        )
        throw new Error(
          `${name}: ${changed} pixels differ from the approved snapshot`,
        )
      }
    }
    console.log(`snapshot ${name}`)
    return PNG.sync.read(buffer)
  }
  for (const name of names) {
    const stats = await page.evaluate(
      (name) => window.gpuTest.renderFixture(name),
      name,
    )
    assert.deepEqual(stats.diagnostics, [])
    const image = await snapshot(name)
    // Independent checks: a board cutout reveals the black clear color; a pour hole
    // reveals the board/bottom copper rather than red top-layer copper.
    const at = (x, y) => [
      ...image.data.slice(
        ((y + 1) * image.width + x + 1) * 4,
        ((y + 1) * image.width + x + 1) * 4 + 3,
      ),
    ]
    if (name === "board-outline-cutout")
      assert.deepEqual(at(400, 300), [0, 0, 0])
    if (name === "pour-holes-and-arcs") {
      assert(at(200, 300)[0] > 150)
      assert(at(400, 280)[0] < 100)
    }
  }
  const large = await page.evaluate(() => window.gpuTest.renderLarge())
  assert.deepEqual(large.diagnostics, [])
  await snapshot("am3352-dev-board")
  const navigation = await page.evaluate(async () => {
    const drawer = window.gpuTest.drawer,
      uploads = drawer.stats.geometryUploads,
      samples = [],
      frames = []
    let previous = performance.now()
    for (let i = 0; i < 90; i++) {
      await new Promise(requestAnimationFrame)
      const start = performance.now()
      frames.push(start - previous)
      previous = start
      const scale = 9 * (1 + i / 60)
      drawer.render({
        transform: { a: scale, b: 0, c: 0, d: -scale, e: 400 + i, f: 300 },
      })
      samples.push(performance.now() - start)
    }
    await drawer.flush()
    samples.sort((a, b) => a - b)
    frames.sort((a, b) => a - b)
    return {
      geometryUploadsDuringZoom: drawer.stats.geometryUploads - uploads,
      submitP95Ms: samples[85],
      frameP95Ms: frames[85],
      maxFrameMs: frames.at(-1),
    }
  })
  assert.equal(navigation.geometryUploadsDuringZoom, 0)
  const adapter = await page.evaluate(async () => {
    const adapter = await navigator.gpu.requestAdapter(),
      info = adapter.info
    return {
      vendor: info.vendor,
      architecture: info.architecture,
      device: info.device,
      description: info.description,
      isFallbackAdapter: info.isFallbackAdapter,
    }
  })
  await page.evaluate(async () => {
    const drawer = window.gpuTest.drawer,
      canvas = document.querySelector("canvas")
    canvas.width = 1200
    canvas.height = 900
    drawer.render()
    await drawer.flush()
    drawer.setCircuitJson([])
    drawer.render()
    await drawer.flush()
    drawer.dispose()
    drawer.dispose()
  })
  // Ignore the browser's optional favicon request.
  assert.deepEqual(
    errors.filter((e) => !e.includes("404")),
    [],
  )
  const report = { snapshots: names.length + 1, adapter, large, navigation }
  await writeFile(
    new URL("./actual/report.json", import.meta.url),
    JSON.stringify(report, null, 2),
  )
  console.log(JSON.stringify(report, null, 2))
} finally {
  await browser?.close()
  await server.close()
}
