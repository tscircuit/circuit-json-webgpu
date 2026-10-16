import { expect, test } from "bun:test"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { createServer } from "vite"
import { chromium } from "playwright"
import { PNG } from "pngjs"
import pixelmatch from "pixelmatch"

test("WebGPU via visibility across the four-layer stack and overview", async () => {
  const server = await createServer({
    root: new URL("../", import.meta.url).pathname,
    server: {
      host: "127.0.0.1",
      port: 0,
      hmr: false,
      watch: { ignored: ["**/*"] },
    },
    logLevel: "error",
  })
  let browser
  try {
    await server.listen()
    browser = await chromium.launch({
      headless: true,
      args: [
        "--enable-unsafe-webgpu",
        ...(process.env.WEBGPU_SOFTWARE
          ? [
              "--enable-gpu",
              "--use-angle=swiftshader",
              "--use-vulkan=swiftshader",
              "--enable-features=Vulkan",
              "--enable-unsafe-swiftshader",
              "--ignore-gpu-blocklist",
            ]
          : []),
      ],
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : {}),
    })
    const page = await browser.newPage()
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(
      `${server.resolvedUrls!.local[0]}tests/via-layer-visibility.html`,
    )
    await page.waitForFunction(() => window.renderViaLayerStack)
    const result = await page.evaluate(() => window.renderViaLayerStack())
    expect(errors).toEqual([])
    expect(result.diagnostics).toEqual([])
    expect(result.observations).toHaveLength(20)
    for (const observation of result.observations) {
      expect(
        observation.visible,
        `${observation.layer}: ${observation.id}`,
      ).toBe(observation.expected)
      expect(
        observation.hole,
        `${observation.layer}: ${observation.id} drill`,
      ).toBe(true)
    }
    const actual = Buffer.from(result.png, "base64")
    const snapshot = new URL(
      "./snapshots/via-layer-visibility.png",
      import.meta.url,
    )
    if (process.env.UPDATE_SNAPSHOTS) {
      await writeFile(snapshot, actual)
    } else {
      const expected = PNG.sync.read(await readFile(snapshot))
      const received = PNG.sync.read(actual)
      expect([received.width, received.height]).toEqual([
        expected.width,
        expected.height,
      ])
      const diff = new PNG({ width: received.width, height: received.height })
      const changed = pixelmatch(
        expected.data,
        received.data,
        diff.data,
        received.width,
        received.height,
        { threshold: 0.1 },
      )
      if (changed > received.width * received.height * 0.001) {
        const dir = new URL("./actual/", import.meta.url)
        await mkdir(dir, { recursive: true })
        await writeFile(new URL("via-layer-visibility.png", dir), actual)
        await writeFile(
          new URL("via-layer-visibility.diff.png", dir),
          PNG.sync.write(diff),
        )
      }
      expect(changed / (received.width * received.height)).toBeLessThanOrEqual(
        0.001,
      )
    }
  } finally {
    await browser?.close()
    await server.close()
  }
}, 60000)
