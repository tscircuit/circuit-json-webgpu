import { afterAll, beforeAll, expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import type { Browser } from "playwright"
import { PNG } from "pngjs"
import { createServer, type ViteDevServer } from "vite"
import { launchWebGpuBrowser } from "../scripts/lib/launch-webgpu-browser"
import { classicF1J6Ground } from "./fixtures/classic-f1-j6-ground"
import { renderSvg } from "./parity/render-svg"
import { featureSnapshot } from "./parity/snapshot"

let server: ViteDevServer
let browser: Browser
let reference: PNG
let shown: PNG
let hidden: PNG
const snapshot = "classic-f1-j6-pour-hidden"
const { elements, viewport, groundSpans } = classicF1J6Ground
const scale = 20
const width = (viewport.maxX - viewport.minX) * scale
const height = (viewport.maxY - viewport.minY) * scale
const transform = {
  a: scale,
  b: 0,
  c: 0,
  d: -scale,
  e: -viewport.minX * scale,
  f: viewport.maxY * scale,
}

beforeAll(async () => {
  // The pinned SVG renderer has no pour visibility toggle. Filter the fills
  // and reset the corresponding display flags in its input only.
  const tracesWithoutPours = elements.flatMap<(typeof elements)[number]>(
    (element) => {
      if (element.type === "pcb_copper_pour") return []
      if (element.type !== "pcb_trace") return [element]
      return [
        {
          ...element,
          route: element.route.map((point) =>
            point.route_type === "wire"
              ? {
                  ...point,
                  is_inside_copper_pour: false,
                  copper_pour_id: undefined,
                }
              : point,
          ),
        },
      ]
    },
  )
  const svg = convertCircuitJsonToPcbSvg(
    tracesWithoutPours as Parameters<typeof convertCircuitJsonToPcbSvg>[0],
    {
      width,
      height,
      viewport,
      layer: "top",
      backgroundColor: "#000000",
      colorOverrides: {
        boardOutline: "#d0d2cd",
        substrate: "#000000",
        copper: { top: "#c83434" },
        drill: "#ff26e2",
        silkscreen: { top: "#f2eda1" },
      },
      drawPaddingOutsideBoard: true,
      includeVersion: false,
      shouldDrawErrors: false,
      shouldDrawRatsNest: false,
      showSolderMask: false,
    },
  )
  reference = PNG.sync.read(await renderSvg(svg))
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
  const frames = await page.evaluate(
    async ({ elements, transform, width, height }) => {
      const canvas = document.querySelector("canvas")!
      canvas.width = width
      canvas.height = height
      const drawer = window.gpuTest.drawer
      const capture = async () => {
        await drawer.flush()
        return canvas.toDataURL("image/png").split(",")[1]
      }
      drawer.drawElements(elements, {
        transform,
        layers: ["top", "top_silkscreen", "edge_cuts", "drill"],
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
    },
    { elements, transform, width, height },
  )
  expect(frames.diagnostics).toEqual([])
  expect(frames.visibilityUploads).toBe(0)
  shown = PNG.sync.read(Buffer.from(frames.shown, "base64"))
  hidden = PNG.sync.read(Buffer.from(frames.hidden, "base64"))
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await server?.close()
})

function groundPixels(image: PNG) {
  return groundSpans.map(({ midpoint }) => {
    const x = Math.floor(transform.a * midpoint.x + transform.e)
    const y = Math.floor(transform.d * midpoint.y + transform.f)
    const index = (y * image.width + x) * 4
    return Array.from(image.data.subarray(index, index + 4))
  })
}

test("Classic F1 matches the SVG and WebGPU comparison snapshot", async () => {
  await mkdir(new URL("./actual/parity/", import.meta.url), { recursive: true })
  const result = await featureSnapshot(snapshot, reference, hidden, snapshot)
  expect(result).toMatchObject({ pass: true })
  expect(groundPixels(reference)).toEqual(
    groundSpans.map(() => [200, 52, 52, 255]),
  )
  expect(groundPixels(shown)).toEqual(groundSpans.map(() => [100, 26, 26, 255]))
})

test.failing(
  "Classic F1 ground traces match the SVG reference with pours hidden",
  () => {
    expect(groundPixels(hidden)).toEqual(groundPixels(reference))
  },
)
