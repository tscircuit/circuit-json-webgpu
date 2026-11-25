import { expect } from "bun:test"
import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import pixelmatch from "pixelmatch"
import { PNG } from "pngjs"
import type { ReactElement } from "react"
import { createServer } from "vite"
import type { RenderOptions } from "../../../lib"
import { launchWebGpuBrowser } from "../../../scripts/lib/launch-webgpu-browser"
import { renderBoard } from "./example-boards"

const WIDTH_PIXELS = 900
const HEIGHT_PIXELS = 330
const PIXELS_PER_MM = 30
const MAX_CHANGED_PIXEL_FRACTION = 0.002
const SNAPSHOT_PIXEL_THRESHOLD = 0.1
const TRANSFORM = {
  a: PIXELS_PER_MM,
  b: 0,
  c: 0,
  d: -PIXELS_PER_MM,
  e: WIDTH_PIXELS / 2,
  f: HEIGHT_PIXELS / 2,
}

/** Render a TSX board once and capture each visibility setting from the GPU. */
export async function renderPhaseSkewFrames({
  board,
  frameOptions,
}: {
  board: ReactElement
  frameOptions: RenderOptions[]
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
      async ({ elements, frameOptions, width, height, transform }) => {
        const canvas = document.querySelector("canvas")!
        const { drawer } = window.gpuTest
        canvas.width = width
        canvas.height = height
        drawer.drawElements(elements, {
          transform,
          background: [0, 0, 0, 1],
          hiddenLayerOpacity: 1,
        })
        const frames: string[] = []
        for (const options of frameOptions) {
          drawer.render(options)
          await drawer.flush()
          frames.push(canvas.toDataURL("image/png").split(",")[1]!)
        }
        return { frames, diagnostics: drawer.diagnostics }
      },
      {
        elements,
        frameOptions,
        width: WIDTH_PIXELS,
        height: HEIGHT_PIXELS,
        transform: TRANSFORM,
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
}: { name: string; frame: PNG }): Promise<void> {
  const baseline = new URL(
    `../../snapshots/phase-skew/${name}.png`,
    import.meta.url,
  )
  const png = PNG.sync.write(frame)
  if (process.env.UPDATE_SNAPSHOTS) {
    await mkdir(new URL(".", baseline), { recursive: true })
    await Bun.write(baseline, png)
    return
  }
  const expected = PNG.sync.read(
    Buffer.from(await Bun.file(baseline).arrayBuffer()),
  )
  expect([frame.width, frame.height]).toEqual([expected.width, expected.height])
  const changedPixels = pixelmatch(
    frame.data,
    expected.data,
    undefined,
    frame.width,
    frame.height,
    {
      threshold: SNAPSHOT_PIXEL_THRESHOLD,
    },
  )
  if (changedPixels > frame.width * frame.height * MAX_CHANGED_PIXEL_FRACTION) {
    const actual = new URL(
      `../../actual/phase-skew/${name}.png`,
      import.meta.url,
    )
    await Bun.write(actual, png)
  }
  expect(changedPixels).toBeLessThanOrEqual(
    frame.width * frame.height * MAX_CHANGED_PIXEL_FRACTION,
  )
}

/** Return the RGB channels at a PCB coordinate in a captured frame. */
export function pixelAt({
  frame,
  x,
  y,
}: { frame: PNG; x: number; y: number }): number[] {
  const column = Math.floor(TRANSFORM.e + x * PIXELS_PER_MM)
  const row = Math.floor(TRANSFORM.f - y * PIXELS_PER_MM)
  const offset = (row * frame.width + column) * 4
  return [...frame.data.subarray(offset, offset + 3)]
}
