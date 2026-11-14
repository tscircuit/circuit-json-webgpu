import { afterAll, beforeAll, expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import pixelmatch from "pixelmatch"
import type { Browser } from "playwright"
import { PNG } from "pngjs"
import { createServer, type ViteDevServer } from "vite"
import { launchWebGpuBrowser } from "../scripts/lib/launch-webgpu-browser"
import { classicF1J6Ground } from "./fixtures/classic-f1-j6-ground"

let server: ViteDevServer
let browser: Browser
let shown: PNG
let hidden: PNG
const snapshot = new URL(
  "./snapshots/classic-f1-j6-pour-hidden.png",
  import.meta.url,
)

beforeAll(async () => {
  server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    server: { host: "127.0.0.1", port: 0, hmr: false },
    logLevel: "error",
  })
  await server.listen()
  browser = await launchWebGpuBrowser()
  const page = await browser.newPage()
  await page.goto(server.resolvedUrls!.local[0])
  await page.waitForFunction(() => window.gpuTest)
  const frames = await page.evaluate(async ({ elements }) => {
    const canvas = document.querySelector("canvas")!
    canvas.width = 120
    canvas.height = 380
    const drawer = window.gpuTest.drawer
    const capture = async () => {
      await drawer.flush()
      return canvas.toDataURL("image/png").split(",")[1]
    }
    drawer.drawElements(elements, {
      transform: { a: 20, b: 0, c: 0, d: -20, e: 449.5, f: -100 },
      layers: ["top"],
      background: [0, 0, 0, 1],
    })
    const initialUploads = drawer.stats.geometryUploads
    const shown = await capture()
    drawer.render({ showCopperPours: false })
    const hidden = await capture()
    return {
      shown,
      hidden,
      diagnostics: drawer.diagnostics,
      visibilityUploads: drawer.stats.geometryUploads - initialUploads,
    }
  }, classicF1J6Ground)
  expect(frames.diagnostics).toEqual([])
  expect(frames.visibilityUploads).toBe(0)
  shown = PNG.sync.read(Buffer.from(frames.shown, "base64"))
  const image = Buffer.from(frames.hidden, "base64")
  hidden = PNG.sync.read(image)
  if (process.env.UPDATE_SNAPSHOTS) await writeFile(snapshot, image)
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await server?.close()
})

function traceMidpoint(image: PNG) {
  const index = (188 * image.width + 60) * 4
  return Array.from(image.data.subarray(index, index + 4))
}

test("hiding Classic F1's J6 copper pour matches the snapshot", async () => {
  const expected = PNG.sync.read(await readFile(snapshot))
  const { width, height } = hidden
  expect([width, height]).toEqual([expected.width, expected.height])
  const changed = pixelmatch(
    expected.data,
    hidden.data,
    undefined,
    width,
    height,
  )
  expect(changed).toBeLessThanOrEqual(width * height * 0.002)
  expect(traceMidpoint(shown)).toEqual([100, 26, 26, 255])
})

test.failing(
  "Classic F1's J6 ground trace stays visible with pours hidden",
  () => {
    expect(traceMidpoint(hidden)).toEqual([200, 52, 52, 255])
  },
)
