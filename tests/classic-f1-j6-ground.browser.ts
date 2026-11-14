import { afterAll, beforeAll, expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import type { Browser } from "playwright"
import { PNG } from "pngjs"
import { createServer, type ViteDevServer } from "vite"
import type { CircuitJson, RenderOptions } from "../lib"
import { launchWebGpuBrowser } from "../scripts/lib/launch-webgpu-browser"
import { classicF1J6Ground } from "./fixtures/classic-f1-j6-ground"
import { renderSvg } from "./parity/render-svg"
import { featureSnapshot } from "./parity/snapshot"

let server: ViteDevServer
let browser: Browser
let svg: Record<"shown" | "hidden" | "xRay", PNG>
let gpu: Record<
  "shown" | "hidden" | "zeroOpacity" | "xRay" | "missingPour" | "offLayerPour",
  string
>
const snapshot = "classic-f1-j6-pour-hidden"
const { elements, viewport, groundSpans } = classicF1J6Ground
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

async function renderReference(
  circuit: CircuitJson,
  xRayElementIds?: string[],
) {
  const source = convertCircuitJsonToPcbSvg(
    [...circuit] as Parameters<typeof convertCircuitJsonToPcbSvg>[0],
    { ...svgOptions, xRayElementIds },
  )
  return PNG.sync.read(await renderSvg(source))
}

beforeAll(async () => {
  // The pinned SVG renderer has no pour visibility toggle. Filter the fills
  // and reset the corresponding display flags in its input only.
  const withoutPours = elements
    .filter((element) => element.type !== "pcb_copper_pour")
    .map((element) => {
      if (element.type !== "pcb_trace") return element
      return {
        ...element,
        route: element.route.map((point) => {
          if (point.route_type === "through_pad") return point
          const { is_inside_copper_pour, copper_pour_id, ...geometry } = point
          return geometry
        }),
      }
    })
  svg = {
    shown: await renderReference(elements),
    hidden: await renderReference(withoutPours),
    xRay: await renderReference(elements, traceIds),
  }
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
  const result = await page.evaluate(
    async ({ elements, transform, width, height, traceIds }) => {
      const canvas = document.querySelector("canvas")!
      canvas.width = width
      canvas.height = height
      const drawer = window.gpuTest.drawer
      const capture = async (options?: RenderOptions) => {
        if (options) drawer.render(options)
        await drawer.flush()
        return canvas.toDataURL("image/png").split(",")[1]
      }
      drawer.drawElements(elements, {
        transform,
        layers: ["top", "top_silkscreen", "edge_cuts", "drill"],
        background: [0, 0, 0, 1],
      })
      const initialUploads = drawer.stats.geometryUploads
      const frames = {
        shown: await capture(),
        hidden: await capture({ showCopperPours: false }),
        zeroOpacity: await capture({
          showCopperPours: true,
          copperPourOpacity: 0,
        }),
        xRay: await capture({
          copperPourOpacity: 0.5,
          xRayElementIds: traceIds,
        }),
      }
      const restored = await capture({ xRayElementIds: [] })
      const visibilityUploads = drawer.stats.geometryUploads - initialUploads
      const diagnostics = [...drawer.diagnostics]

      // Model a subset view that kept the trace records but left out the pour
      // they refer to, or moved that pour to a different copper layer.
      const missingPour = elements.filter(
        (element) => element.type !== "pcb_copper_pour",
      )
      const offLayerPour = elements.map((element) =>
        element.type === "pcb_copper_pour"
          ? { ...element, layer: "bottom" as const }
          : element,
      )
      const captureSubset = (subset: CircuitJson) => {
        drawer.setCircuitJson(subset)
        diagnostics.push(...drawer.diagnostics)
        return capture({})
      }
      return {
        frames: {
          ...frames,
          missingPour: await captureSubset(missingPour),
          offLayerPour: await captureSubset(offLayerPour),
        },
        restored,
        diagnostics,
        visibilityUploads,
      }
    },
    { elements, transform, width, height, traceIds },
  )
  expect(result.diagnostics).toEqual([])
  expect(result.visibilityUploads).toBe(0)
  expect(result.restored).toEqual(result.frames.shown)
  gpu = result.frames
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await server?.close()
})

function decodeFrame(frame: string) {
  return PNG.sync.read(Buffer.from(frame, "base64"))
}

function groundPixels(frame: PNG | string) {
  const image = typeof frame === "string" ? decodeFrame(frame) : frame
  return groundSpans.map(({ midpoint }) => {
    const x = Math.floor(transform.a * midpoint.x + transform.e)
    const y = Math.floor(transform.d * midpoint.y + transform.f)
    const index = (y * image.width + x) * 4
    return Array.from(image.data.subarray(index, index + 4))
  })
}

test("Classic F1 matches the SVG and WebGPU comparison snapshot", async () => {
  await mkdir(new URL("./actual/parity/", import.meta.url), { recursive: true })
  const result = await featureSnapshot(
    snapshot,
    svg.hidden,
    decodeFrame(gpu.hidden),
    snapshot,
  )
  expect(result).toMatchObject({ pass: true })
  expect(groundPixels(svg.hidden)).toEqual(
    groundSpans.map(() => [200, 52, 52, 255]),
  )
  const pourPixels = groundPixels(svg.shown)
  expect(pourPixels).toEqual(groundSpans.map(() => [100, 26, 26, 255]))
  expect(groundPixels(gpu.shown)).toEqual(pourPixels)
})

test.each(["hidden", "zeroOpacity", "missingPour", "offLayerPour"] as const)(
  "Classic F1 ground traces in %s match the SVG render without pours",
  (frame) => expect(groundPixels(gpu[frame])).toEqual(groundPixels(svg.hidden)),
)

test("Classic F1 ground traces match the native SVG X-Ray view", () => {
  const reference = groundPixels(svg.xRay)
  expect(reference).toEqual(groundPixels(svg.hidden))
  expect(groundPixels(gpu.xRay)).toEqual(reference)
})
