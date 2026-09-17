import assert from "node:assert/strict"
import { chromium } from "playwright"
import { createServer } from "vite"
import { fileURLToPath } from "node:url"

const server = await createServer({
  root: fileURLToPath(new URL("../../", import.meta.url)),
  server: { host: "127.0.0.1", port: 0 },
  logLevel: "error",
})
await server.listen()
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
    : {}),
})
try {
  const page = await browser.newPage()
  await page.goto(
    `${server.resolvedUrls!.local[0]}tests/actual/parity/index.html`,
  )
  for (const width of [1200, 480]) {
    await page.setViewportSize({ width, height: 900 })
    const pairs = await page.locator(".pair").evaluateAll((nodes) =>
      nodes.map((node) => {
        const figures = [...node.querySelectorAll("figure")]
        const boxes = figures.map((f) => f.getBoundingClientRect())
        return {
          labels: figures.map(
            (f) => f.querySelector("figcaption")!.textContent,
          ),
          sources: figures.map((f) =>
            f.querySelector("img")!.getAttribute("src"),
          ),
          sameRow: boxes[0].y === boxes[1].y,
          leftFirst: boxes[0].right <= boxes[1].left,
        }
      }),
    )
    assert(pairs.length > 0)
    for (const pair of pairs) {
      assert.deepEqual(pair.labels, ["circuit-to-svg", "circuit-json-webgpu"])
      assert(pair.sources[0]!.endsWith(".svg.png"))
      assert.equal(
        pair.sources[1],
        pair.sources[0]!.replace(".svg.png", ".webgpu.png"),
      )
      assert(pair.sameRow && pair.leftFirst)
    }
    console.log(
      `${pairs.length} pairs correctly ordered side by side at ${width}px`,
    )
  }
  await page.setViewportSize({ width: 1200, height: 900 })
  const section = page.locator("#case-0028")
  await section.scrollIntoViewIfNeeded()
  await section
    .locator("img")
    .first()
    .evaluate((img) => (img as HTMLImageElement).decode())
  await section
    .locator(".pair img")
    .nth(1)
    .evaluate((img) => (img as HTMLImageElement).decode())
  await section.screenshot({ path: "tests/actual/parity/layout-text.png" })
} finally {
  await browser.close()
  await server.close()
}
