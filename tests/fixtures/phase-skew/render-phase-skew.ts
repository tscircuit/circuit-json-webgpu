import { expect } from "bun:test"
import type { Point } from "circuit-json"
import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import pixelmatch from "pixelmatch"
import { PNG } from "pngjs"
import type { ReactElement } from "react"
import { applyToPoint } from "transformation-matrix"
import { createServer } from "vite"
import type { CircuitJson, RenderOptions } from "../../../lib"
import { launchWebGpuBrowser } from "../../../scripts/lib/launch-webgpu-browser"
import { renderBoard } from "./example-boards"

const WIDTH_PIXELS = 900
const HEIGHT_PIXELS = 330
const PIXELS_PER_MM = 30
const MAX_CHANGED_PIXEL_FRACTION = 0.002
const SNAPSHOT_PIXEL_THRESHOLD = 0.1
const UPDATE_SNAPSHOTS = process.env.UPDATE_SNAPSHOTS === "1"
const TRANSFORM = {
  a: PIXELS_PER_MM,
  b: 0,
  c: 0,
  d: -PIXELS_PER_MM,
  e: WIDTH_PIXELS / 2,
  f: HEIGHT_PIXELS / 2,
}
/** Rows above the board that hold the caption; snapshots skip them because fonts differ by OS. */
export const CAPTION_HEIGHT = 36
const DEFAULT_VIEWPORT = {
  width: WIDTH_PIXELS,
  height: HEIGHT_PIXELS,
  transform: TRANSFORM,
}

/**
 * Render a TSX board once and capture each visibility setting from the GPU.
 * With `caption`, each frame gets a band on top that describes the overlay and
 * hover state it was rendered with.
 */
export async function renderPhaseSkewFrames({
  board,
  frameOptions,
  viewport = DEFAULT_VIEWPORT,
  caption = false,
}: {
  board: ReactElement
  frameOptions: RenderOptions[] | ((elements: CircuitJson) => RenderOptions[])
  viewport?: typeof DEFAULT_VIEWPORT
  caption?: boolean
}): Promise<PNG[]> {
  const elements = await renderBoard({ board })
  expect(
    elements.filter(
      (element) => element.type === "pcb_differential_pair_phase_skew",
    ),
  ).toHaveLength(1)
  const server = await createServer({
    root: fileURLToPath(new URL("../../../", import.meta.url)),
    server: { host: "127.0.0.1", port: 0, hmr: false },
    logLevel: "error",
  })
  let browser: Awaited<ReturnType<typeof launchWebGpuBrowser>> | undefined
  try {
    await server.listen()
    browser = await launchWebGpuBrowser()
    const page = await browser.newPage()
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(server.resolvedUrls!.local[0])
    await page.waitForFunction(() => window.gpuTest)
    const result = await page.evaluate(
      async ({
        elements,
        frameOptions,
        width,
        height,
        transform,
        captionHeight,
      }) => {
        const canvas = document.querySelector("canvas")!
        const { drawer } = window.gpuTest
        canvas.width = width
        canvas.height = height
        drawer.drawElements(elements, {
          transform,
          background: [0, 0, 0, 1],
          hiddenLayerOpacity: 1,
        })
        const skew = elements.find(
          (element) => element.type === "pcb_differential_pair_phase_skew",
        )
        const traceName = (id: string) => {
          if (id === skew?.positive_trace.pcb_trace_id) return "positive trace"
          if (id === skew?.negative_trace.pcb_trace_id) return "negative trace"
          return id
        }
        const frames: string[] = []
        let state: RenderOptions = {}
        for (const options of frameOptions) {
          drawer.render(options)
          await drawer.flush()
          state = { ...state, ...options }
          const png = canvas.toDataURL("image/png")
          if (captionHeight === 0) {
            frames.push(png.split(",")[1]!)
            continue
          }
          // Copy the WebGPU frame through a PNG; drawImage of the canvas itself is blank.
          const board = new Image()
          board.src = png
          await board.decode()
          const hovered = (state.highlightedElementIds ?? []).map(traceName)
          const text = `Phase skew overlay ${state.showDifferentialPairPhaseSkew ? "on" : "off"} · ${hovered.length > 0 ? `hovering the ${hovered.join(", ")}` : "nothing hovered"}`
          const output = document.createElement("canvas")
          output.width = width
          output.height = height + captionHeight
          const context = output.getContext("2d")!
          context.fillStyle = "#000"
          context.fillRect(0, 0, output.width, output.height)
          context.fillStyle = "#fff"
          context.font = "16px sans-serif"
          context.textAlign = "center"
          context.textBaseline = "middle"
          context.fillText(text, width / 2, captionHeight / 2)
          context.drawImage(board, 0, captionHeight)
          frames.push(output.toDataURL("image/png").split(",")[1]!)
        }
        return { frames, diagnostics: drawer.diagnostics }
      },
      {
        elements,
        frameOptions:
          typeof frameOptions === "function"
            ? frameOptions(elements)
            : frameOptions,
        ...viewport,
        captionHeight: caption ? CAPTION_HEIGHT : 0,
      },
    )
    expect(errors).toEqual([])
    expect(result.diagnostics).toEqual([])
    return result.frames.map((frame) =>
      PNG.sync.read(Buffer.from(frame, "base64")),
    )
  } finally {
    await browser?.close()
    await server.close()
  }
}

/** Compare or update a PNG using the repository's visual-test tolerance. */
export async function expectPhaseSkewSnapshot({
  name,
  frame,
  captioned = false,
}: { name: string; frame: PNG; captioned?: boolean }): Promise<void> {
  const baseline = new URL(
    `../../snapshots/phase-skew/${name}.png`,
    import.meta.url,
  )
  const png = PNG.sync.write(frame)
  if (UPDATE_SNAPSHOTS) {
    await mkdir(new URL(".", baseline), { recursive: true })
    await Bun.write(baseline, png)
    return
  }
  const expected = PNG.sync.read(
    Buffer.from(await Bun.file(baseline).arrayBuffer()),
  )
  expect([frame.width, frame.height]).toEqual([expected.width, expected.height])
  const skippedRows = captioned ? CAPTION_HEIGHT : 0
  const comparedHeight = frame.height - skippedRows
  const changedPixels = pixelmatch(
    frame.data.subarray(skippedRows * frame.width * 4),
    expected.data.subarray(skippedRows * frame.width * 4),
    undefined,
    frame.width,
    comparedHeight,
    {
      threshold: SNAPSHOT_PIXEL_THRESHOLD,
    },
  )
  const allowedPixels =
    frame.width * comparedHeight * MAX_CHANGED_PIXEL_FRACTION
  if (changedPixels > allowedPixels) {
    const actual = new URL(
      `../../actual/phase-skew/${name}.png`,
      import.meta.url,
    )
    await mkdir(new URL(".", actual), { recursive: true })
    await Bun.write(actual, png)
  }
  expect(changedPixels).toBeLessThanOrEqual(allowedPixels)
}

/** Return the RGB channels at a PCB coordinate in a captured frame. */
export function pixelAt({
  frame,
  x,
  y,
  transform = TRANSFORM,
}: Point & { frame: PNG; transform?: typeof TRANSFORM }): number[] {
  const { x: column, y: row } = applyToPoint(transform, { x, y })
  const offset = (Math.floor(row) * frame.width + Math.floor(column)) * 4
  return [...frame.data.subarray(offset, offset + 3)]
}

const JOINT_PIXELS_PER_MM = 240
export const JOINT_VIEWPORT = {
  width: 600,
  height: 480,
  transform: {
    a: JOINT_PIXELS_PER_MM,
    b: 0,
    c: 0,
    d: -JOINT_PIXELS_PER_MM,
    e: 300,
    f: 350,
  },
}
