import assert from "node:assert/strict"
import { readFile, writeFile } from "node:fs/promises"
import { createServer } from "vite"
import type { Page } from "playwright"
import type { PcbBoard } from "circuit-json"
import { PNG } from "pngjs"
import pixelmatch from "pixelmatch"
import { launchWebGpuBrowser } from "../scripts/lib/launch-webgpu-browser"
import { createCoverlayCircuit } from "./fixtures/coverlay-circuit"

async function checkCoverlay({
  page,
  color,
  expected,
}: {
  page: Page
  color: PcbBoard["coverlay_color"]
  expected: number[]
}) {
  const png = await page.evaluate(async (elements) => {
    const drawer = window.gpuTest.drawer
    drawer.drawElements(elements, {
      transform: { a: 40, b: 0, c: 0, d: -40, e: 400, f: 300 },
      selectedLayer: "top",
      hiddenLayerOpacity: 0,
      showSolderMask: true,
      showBoardMaterial: true,
      showSilkscreen: false,
      background: [0.9, 0.9, 0.9, 1],
    })
    await drawer.flush()
    return document
      .querySelector("canvas")!
      .toDataURL("image/png")
      .split(",")[1]
  }, createCoverlayCircuit(color))
  const actual = Buffer.from(png, "base64")
  const image = PNG.sync.read(actual)
  const offset = (200 * image.width + 400) * 4
  assert.deepEqual([...image.data.subarray(offset, offset + 4)], expected)
  const file = new URL(`./snapshots/coverlay-${color}.png`, import.meta.url)
  if (process.env.UPDATE_SNAPSHOTS) {
    await writeFile(file, actual)
  } else {
    const baseline = PNG.sync.read(await readFile(file))
    assert.equal(baseline.width, image.width)
    assert.equal(baseline.height, image.height)
    const changed = pixelmatch(
      image.data,
      baseline.data,
      undefined,
      image.width,
      image.height,
      { threshold: 0.1 },
    )
    assert(
      changed < image.width * image.height * 0.002,
      `${color}: ${changed} changed pixels`,
    )
  }
}

const server = await createServer({
  server: { host: "127.0.0.1", port: 0, hmr: false },
  logLevel: "error",
})
await server.listen()
let browser
try {
  browser = await launchWebGpuBrowser()
  const page = await browser.newPage({
    viewport: { width: 900, height: 800 },
    deviceScaleFactor: 1,
  })
  await page.goto(server.resolvedUrls!.local[0]!)
  await page.waitForFunction(() => window.gpuTest, null, { timeout: 30000 })
  await checkCoverlay({ page, color: "yellow", expected: [204, 156, 51, 255] })
  await checkCoverlay({ page, color: "black", expected: [17, 17, 17, 255] })
  await checkCoverlay({ page, color: "white", expected: [255, 255, 255, 255] })
  console.log("Yellow, black and white WebGPU coverlay snapshots passed")
} finally {
  await browser?.close()
  await server.close()
}
