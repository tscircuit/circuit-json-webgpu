import assert from "node:assert/strict"
import { mkdir, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { PNG } from "pngjs"
import { createServer } from "vite"
import { launchWebGpuBrowser } from "../../scripts/lib/launch-webgpu-browser"

// bun tests/repro/courtyards.capture.ts
// Captures the real GPU reproduction, and verifies its visibility control.
const server = await createServer({
  root: fileURLToPath(new URL("../../", import.meta.url)),
  server: { host: "127.0.0.1", port: 0, hmr: false },
  logLevel: "error",
})
let browser
try {
  await server.listen()
  browser = await launchWebGpuBrowser()
  const page = await browser.newPage({
    viewport: { width: 1000, height: 1400 },
    deviceScaleFactor: 1,
  })
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto(`${server.resolvedUrls!.local[0]}tests/repro/courtyards.html`)
  await page.waitForFunction(() => window.courtyardRepro, null, {
    timeout: 30000,
  })
  const shown = await page.locator("canvas").screenshot()
  await page.evaluate(() => window.courtyardRepro!.render(false))
  const hidden = PNG.sync.read(await page.locator("canvas").screenshot())
  // Ignore the fractional CSS edge of a responsive canvas; inspect its pixels.
  const center =
    (Math.floor(hidden.height / 2) * hidden.width +
      Math.floor(hidden.width / 2)) *
    4
  const background = [...hidden.data.subarray(center, center + 4)]
  for (let y = 2; y < hidden.height - 2; y++)
    for (let x = 2; x < hidden.width - 2; x++) {
      const i = (y * hidden.width + x) * 4
      assert.deepEqual([...hidden.data.subarray(i, i + 4)], background)
    }
  assert.notDeepEqual(PNG.sync.read(shown).data, hidden.data)
  await page.evaluate(() => window.courtyardRepro!.render(true))
  assert.deepEqual(errors, [])
  const output = new URL("../actual/", import.meta.url)
  await mkdir(output, { recursive: true })
  await page.screenshot({
    path: fileURLToPath(new URL("courtyards.png", output)),
    fullPage: true,
  })
  const evidence = await page.evaluate(() => ({
    adapter: window.courtyardRepro!.drawer.adapterInfo,
    diagnostics: window.courtyardRepro!.drawer.diagnostics,
  }))
  await writeFile(
    new URL("courtyards.json", output),
    JSON.stringify(evidence, null, 2),
  )
  console.log(
    "Courtyard GPU repro captured in tests/actual/courtyards.png; show/hide verified.",
  )
} finally {
  await browser?.close()
  await server.close()
}
