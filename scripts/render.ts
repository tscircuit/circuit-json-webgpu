import { parseArgs } from "node:util"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { createServer } from "vite"
import { chromium } from "playwright"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { compileCircuitJson, type CircuitJson } from "../lib"
import { prepareComparison } from "../tests/parity/prepare"

const { positionals, values } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    output: { type: "string", default: "tests/actual/local-render" },
    width: { type: "string", default: "1200" },
    height: { type: "string", default: "900" },
    layer: { type: "string", default: "top" },
    viewport: { type: "string" },
    help: { type: "boolean" },
  },
})
if (values.help || !positionals[0]) {
  console.log(
    "bun run render board.circuit.json [--output directory] [--width 1200] [--height 900] [--layer top] [--viewport minX,minY,maxX,maxY]\nRequires Chromium: bunx playwright install chromium. Set WEBGPU_SOFTWARE=1 for SwiftShader.",
  )
  process.exit(values.help ? 0 : 1)
}
const elements = JSON.parse(
  await readFile(resolve(positionals[0]), "utf8"),
) as CircuitJson
const width = Number(values.width),
  height = Number(values.height)
if (![width, height].every((n) => Number.isInteger(n) && n > 0 && n <= 8192))
  throw new Error("Invalid image dimensions")
const compiled = compileCircuitJson(elements)
let minX = Infinity,
  minY = Infinity,
  maxX = -Infinity,
  maxY = -Infinity
for (const layer of compiled.layers)
  for (const mesh of [layer.paint, layer.erase]) {
    for (let i = 0; i < mesh.vertices.length; i += 8) {
      minX = Math.min(minX, mesh.vertices[i])
      maxX = Math.max(maxX, mesh.vertices[i])
      minY = Math.min(minY, mesh.vertices[i + 1])
      maxY = Math.max(maxY, mesh.vertices[i + 1])
    }
  }
if (values.viewport)
  [minX, minY, maxX, maxY] = values.viewport.split(",").map(Number)
else {
  const pad = Math.max(maxX - minX, maxY - minY) * 0.05 || 1
  minX -= pad
  minY -= pad
  maxX += pad
  maxY += pad
}
if (
  ![minX, minY, maxX, maxY].every(Number.isFinite) ||
  maxX <= minX ||
  maxY <= minY
)
  throw new Error("No renderable bounds; pass --viewport minX,minY,maxX,maxY")
const { scene, reason } = prepareComparison({
  width,
  height,
  elements: [...elements],
  options: {
    layers: [
      "copper",
      "silkscreen",
      "fabrication_note",
      "user_note",
      "courtyard",
    ].map((kind) => `${values.layer}_${kind}`),
  },
  contextTransform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
  matrix: {
    a: width / (maxX - minX),
    b: 0,
    c: 0,
    d: -height / (maxY - minY),
    e: (-minX * width) / (maxX - minX),
    f: (maxY * height) / (maxY - minY),
  },
})
if (!scene) throw new Error(reason)
if (
  ![
    "top",
    "bottom",
    "inner1",
    "inner2",
    "inner3",
    "inner4",
    "inner5",
    "inner6",
    "inner7",
    "inner8",
  ].includes(values.layer)
)
  throw new Error("Invalid layer")
scene.layer = values.layer as NonNullable<typeof scene.layer>
const out = resolve(values.output)
await mkdir(out, { recursive: true })
const svg = convertCircuitJsonToPcbSvg(
  scene.elements as unknown as Parameters<typeof convertCircuitJsonToPcbSvg>[0],
  {
    width,
    height,
    viewport: scene.viewport,
    layer: scene.layer,
    backgroundColor: "#000000",
    drawPaddingOutsideBoard: false,
    includeVersion: false,
    showSolderMask: false,
    showCourtyards: true,
    showPcbNotes: true,
    shouldDrawErrors: false,
    shouldDrawRatsNest: false,
  },
)
await writeFile(resolve(out, "circuit-to-svg.svg"), svg)
const server = await createServer({
  cacheDir: ".vite/local-render",
  root: fileURLToPath(new URL("../", import.meta.url)),
  server: {
    host: "127.0.0.1",
    port: 20000 + Math.floor(Math.random() * 30000),
    hmr: false,
    watch: { ignored: ["**/*"] },
  },
  logLevel: "error",
})
console.log("Starting local browser server")
await server.listen()
console.log("Starting Chromium")
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
    : {}),
  args: [
    "--enable-unsafe-webgpu",
    ...(process.env.WEBGPU_SOFTWARE
      ? [
          "--use-angle=swiftshader",
          "--enable-unsafe-swiftshader",
          "--ignore-gpu-blocklist",
          "--enable-gpu",
          "--enable-features=Vulkan",
          "--use-vulkan=swiftshader",
        ]
      : []),
  ],
})
try {
  console.log("Chromium ready; rendering board")
  const page = await browser.newPage()
  await page.goto(`${server.resolvedUrls!.local[0]}tests/parity/`)
  await page.waitForFunction(() => window.parity)
  const result = await page.evaluate(
    (scene) => window.parity.render(scene),
    scene,
  )
  await writeFile(
    resolve(out, "circuit-json-webgpu.png"),
    Buffer.from(result.png, "base64"),
  )
  const adapter = await page.evaluate(async () => {
    const info = (await navigator.gpu.requestAdapter())?.info
    return info
      ? {
          vendor: info.vendor,
          architecture: info.architecture,
          device: info.device,
          description: info.description,
          isFallbackAdapter: info.isFallbackAdapter,
        }
      : null
  })
  await writeFile(
    resolve(out, "report.json"),
    JSON.stringify(
      { viewport: scene.viewport, diagnostics: result.diagnostics, adapter },
      null,
      2,
    ),
  )
  await writeFile(
    resolve(out, "index.html"),
    '<!doctype html><meta charset="utf-8"><title>SVG / rendered WebGPU</title><style>body{background:#161616;color:white;font:16px system-ui}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px;min-width:600px}figure{margin:0}img{width:100%;display:block}figcaption{padding:12px}</style><div class="pair"><figure><figcaption>circuit-to-svg</figcaption><img src="circuit-to-svg.svg"></figure><figure><figcaption>circuit-json-webgpu</figcaption><img src="circuit-json-webgpu.png"></figure></div>',
  )
  console.log(
    `Rendered with WebGPU: ${resolve(out, "index.html")}\nDiagnostics: ${result.diagnostics.length}`,
  )
  await page.evaluate(() => window.parity.dispose())
} finally {
  await browser.close()
  await server.close()
}
