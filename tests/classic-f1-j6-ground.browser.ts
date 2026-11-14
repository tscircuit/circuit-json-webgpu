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
let pourReference: PNG
let xRayReference: PNG
let shown: PNG
let hidden: PNG
let zeroOpacity: PNG
let xRay: PNG
let missingPour: PNG
let differentLayerPour: PNG
const snapshot = "classic-f1-j6-pour-hidden"
const { elements, viewport, groundSpans } = classicF1J6Ground
const originalCircuit = [...elements] as Parameters<
  typeof convertCircuitJsonToPcbSvg
>[0]
const traceIds = groundSpans.map(({ id }) => id)
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
const svgOptions = {
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
} satisfies NonNullable<Parameters<typeof convertCircuitJsonToPcbSvg>[1]>

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
          route: element.route.map((point) => {
            if (point.route_type === "through_pad") return point
            const { is_inside_copper_pour, copper_pour_id, ...geometry } = point
            return geometry
          }),
        },
      ]
    },
  )
  const svg = convertCircuitJsonToPcbSvg(
    tracesWithoutPours as Parameters<typeof convertCircuitJsonToPcbSvg>[0],
    svgOptions,
  )
  reference = PNG.sync.read(await renderSvg(svg))
  const pourSvg = convertCircuitJsonToPcbSvg(originalCircuit, svgOptions)
  pourReference = PNG.sync.read(await renderSvg(pourSvg))
  const inspectionSvg = convertCircuitJsonToPcbSvg(originalCircuit, {
    ...svgOptions,
    xRayElementIds: traceIds,
  })
  xRayReference = PNG.sync.read(await renderSvg(inspectionSvg))
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
    async ({ elements, transform, width, height, traceIds }) => {
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
      drawer.render({ showCopperPours: true, copperPourOpacity: 0 })
      const zeroOpacity = await capture()
      drawer.render({ copperPourOpacity: 0.5, xRayElementIds: traceIds })
      const xRay = await capture()
      drawer.render({ xRayElementIds: [] })
      const restored = await capture()
      const visibilityUploads = drawer.stats.geometryUploads - initialUploads
      const diagnostics = [...drawer.diagnostics]

      // Model a subset view that kept the trace records but left out the pour
      // they refer to, or moved that pour to a different copper layer.
      const missingPour = elements.filter(
        (element) => element.type !== "pcb_copper_pour",
      )
      const differentLayerPour = elements.map((element) =>
        element.type === "pcb_copper_pour"
          ? { ...element, layer: "bottom" as const }
          : element,
      )
      drawer.setCircuitJson(missingPour)
      drawer.render()
      const withoutPour = await capture()
      diagnostics.push(...drawer.diagnostics)
      drawer.setCircuitJson(differentLayerPour)
      drawer.render()
      const withoutSameLayerPour = await capture()
      diagnostics.push(...drawer.diagnostics)
      return {
        shown,
        hidden,
        zeroOpacity,
        xRay,
        restored,
        diagnostics,
        visibilityUploads,
        withoutPour,
        withoutSameLayerPour,
      }
    },
    {
      elements,
      transform,
      width,
      height,
      traceIds,
    },
  )
  expect(frames.diagnostics).toEqual([])
  expect(frames.visibilityUploads).toBe(0)
  expect(frames.restored).toEqual(frames.shown)
  shown = PNG.sync.read(Buffer.from(frames.shown, "base64"))
  hidden = PNG.sync.read(Buffer.from(frames.hidden, "base64"))
  zeroOpacity = PNG.sync.read(Buffer.from(frames.zeroOpacity, "base64"))
  xRay = PNG.sync.read(Buffer.from(frames.xRay, "base64"))
  missingPour = PNG.sync.read(Buffer.from(frames.withoutPour, "base64"))
  differentLayerPour = PNG.sync.read(
    Buffer.from(frames.withoutSameLayerPour, "base64"),
  )
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
  const pourPixels = groundPixels(pourReference)
  expect(pourPixels).toEqual(groundSpans.map(() => [100, 26, 26, 255]))
  expect(groundPixels(shown)).toEqual(pourPixels)
})

test("Classic F1 ground traces match the SVG reference with pours hidden", () => {
  expect(groundPixels(hidden)).toEqual(groundPixels(reference))
  expect(groundPixels(zeroOpacity)).toEqual(groundPixels(reference))
})

test("Classic F1 ground traces match the native SVG X-Ray view", () => {
  const referencePixels = groundPixels(xRayReference)
  expect(referencePixels).toEqual(groundPixels(reference))
  expect(groundPixels(xRay)).toEqual(referencePixels)
})

test("a missing or off-layer copper pour leaves its traces visible", () => {
  expect(groundPixels(missingPour)).toEqual(groundPixels(reference))
  expect(groundPixels(differentLayerPour)).toEqual(groundPixels(reference))
})
