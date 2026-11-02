import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { PNG } from "pngjs"
import pixelmatch from "pixelmatch"
import { createServer } from "vite"
import { compose, scale, translate } from "transformation-matrix"
import type { CircuitJson } from "../lib"
import { launchWebGpuBrowser } from "../scripts/lib/launch-webgpu-browser"
import boardViaTenting from "./fixtures/board-via-tenting.circuit.json"

test("the via-tenting board retains its named-color legends", async () => {
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    server: { host: "127.0.0.1", port: 0, hmr: false },
    logLevel: "error",
  })
  await server.listen()
  const browser = await launchWebGpuBrowser()
  try {
    const page = await browser.newPage({
      viewport: { width: 900, height: 500 },
    })
    await page.goto(server.resolvedUrls!.local[0])
    await page.waitForFunction(() => window.gpuTest)
    const diagnostics = await page.evaluate(
      async ({ circuitJson, boardToPxTransform }) => {
        const canvas = document.querySelector("canvas")!
        canvas.width = 900
        canvas.height = 400
        canvas.style.cssText = "width:900px;height:400px;border:0;margin:0"
        const drawer = window.gpuTest.drawer
        drawer.drawElements(circuitJson, {
          transform: boardToPxTransform,
          selectedLayer: "top",
          showSolderMask: true,
          showPcbNotes: true,
          background: [0, 0, 0, 1],
        })
        await drawer.flush()
        return drawer.diagnostics
      },
      {
        circuitJson: boardViaTenting as CircuitJson,
        boardToPxTransform: compose(translate(450, 200), scale(3.6, -3.6)),
      },
    )
    const actual = Buffer.from(
      await page.evaluate(
        () => document.querySelector("canvas")!.toDataURL().split(",")[1],
      ),
      "base64",
    )
    const snapshot = new URL(
      "./snapshots/board-via-tenting-css-colors.png",
      import.meta.url,
    )
    if (process.env.UPDATE_SNAPSHOTS) await writeFile(snapshot, actual)
    const expected = PNG.sync.read(await readFile(snapshot))
    const rendered = PNG.sync.read(actual)
    const changed = pixelmatch(
      expected.data,
      rendered.data,
      undefined,
      expected.width,
      expected.height,
      { threshold: 0.1 },
    )
    expect(changed).toBeLessThanOrEqual(
      expected.width * expected.height * 0.002,
    )
    expect(diagnostics).toEqual([])
  } finally {
    await browser.close()
    await server.close()
  }
}, 60_000)
