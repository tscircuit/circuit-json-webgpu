import { readFile, writeFile, mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { createServer } from "vite"
import { chromium } from "playwright"
import { PNG } from "pngjs"
import { compare } from "./compare.mjs"
const root = fileURLToPath(new URL("../../", import.meta.url))
const dir = new URL("../actual/parity/", import.meta.url)
const cases = JSON.parse(await readFile(new URL("cases.json", dir), "utf8"))
const tests = JSON.parse(await readFile(new URL("tests.json", dir), "utf8"))
const server = await createServer({
  root,
  server: { host: "127.0.0.1", port: 0 },
  logLevel: "error",
})
await server.listen()
const browser = await chromium.launch({
  headless: true,
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
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
    : {}),
})
const results = []
try {
  const page = await browser.newPage()
  page.on("pageerror", (e) => console.error("Browser:", e.message))
  await page.goto(
    `http://127.0.0.1:${server.httpServer.address().port}/tests/parity/`,
  )
  await page.waitForFunction(() => window.parity)
  for (const c of cases) {
    if (
      process.env.PARITY_TEXT_ONLY &&
      !(c.elements.length && c.elements.every((e) => e.type.endsWith("_text")))
    )
      continue
    try {
      const result = await page.evaluate((c) => window.parity.render(c), c)
      const actual = PNG.sync.read(Buffer.from(result.png, "base64"))
      const expected = PNG.sync.read(
        await readFile(new URL(`${c.id}.reference.png`, dir)),
      )
      const before = PNG.sync.read(
        await readFile(new URL(`${c.id}.before.png`, dir)),
      )
      const diff = new PNG({ width: c.width, height: c.height })
      const { changed, rawChanged } = compare(expected, actual, diff)
      let ink = 0
      for (let i = 0; i < expected.data.length; i += 4)
        if (
          [0, 1, 2, 3].some(
            (k) => Math.abs(expected.data[i + k] - before.data[i + k]) > 8,
          )
        )
          ink++
      // Both an image-wide and ink-relative bound prevent tiny missing labels
      // from disappearing into the background allowance.
      const allowance = Math.ceil(
        Math.max(4, Math.min(c.width * c.height * 0.002, ink * 0.02)),
      )
      const pass = changed <= allowance && result.diagnostics.length === 0
      await writeFile(
        new URL(`${c.id}.webgpu.png`, dir),
        Buffer.from(result.png, "base64"),
      )
      if (!pass)
        await writeFile(new URL(`${c.id}.diff.png`, dir), PNG.sync.write(diff))
      results.push({
        id: c.id,
        test: c.testName,
        path: c.testPath,
        pass,
        changedPixels: changed,
        rawChangedPixels: rawChanged,
        inkPixels: ink,
        allowance,
        diagnostics: result.diagnostics,
      })
      console.log(
        `${pass ? "PASS" : "DIFF"} ${c.id} ${c.testName}: ${changed} pixels (${ink} ink)`,
      )
    } catch (error) {
      results.push({
        id: c.id,
        test: c.testName,
        path: c.testPath,
        pass: false,
        error: String(error),
      })
      console.error(c.id, error)
    }
  }
  await page.evaluate(() => window.parity.dispose())
} finally {
  await browser.close()
  await server.close()
}
const pureTextResults = results.filter((r) => {
  const c = cases.find((c) => c.id === r.id)
  return c.elements.length && c.elements.every((e) => e.type.endsWith("_text"))
})
const report = {
  textRenderCalls: pureTextResults.length,
  textParityPassed: pureTextResults.filter((r) => r.pass).length,
  textParityFailed: pureTextResults.filter((r) => !r.pass).length,
  upstreamCommit: "fa8405c67634e287b79a1506eedde077ef6accb0",
  testFiles: new Set(tests.map((t) => t.path)).size,
  tests: tests.length,
  referencePassed: tests.filter((t) => t.status === "passed").length,
  referenceFailed: tests.filter((t) => t.status === "failed").length,
  renderCalls: results.length,
  parityPassed: results.filter((r) => r.pass).length,
  parityFailed: results.filter((r) => !r.pass).length,
  testsWithoutCircuitDrawCalls: tests.filter((t) => !t.caseIds.length),
  referenceTests: tests,
  results,
}
await writeFile(new URL("report.json", dir), JSON.stringify(report, null, 2))
const html =
  `<!doctype html><meta charset="utf-8"><title>Canvas / WebGPU parity</title><style>body{font:14px system-ui;background:#161616;color:white}section{border-top:1px solid #888;padding:16px}figure{display:inline-block;width:30%;vertical-align:top;margin:1%}img{max-width:100%;background:repeating-conic-gradient(#333 0% 25%,#444 0% 50%) 0/16px 16px}pre{white-space:pre-wrap}</style><h1>Canvas / WebGPU parity</h1><p>${report.parityPassed}/${results.length} render calls pass; ${report.referencePassed}/${tests.length} original tests pass their original assertions. ${report.testsWithoutCircuitDrawCalls.length} tests do not call the circuit drawer and are listed separately in report.json.</p>` +
  results
    .map(
      (r) =>
        `<section><h2>${r.pass ? "PASS" : "DIFF"} ${r.id}: ${r.test.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</h2><p>${r.changedPixels ?? "?"} pixels differ; allowance ${r.allowance ?? "?"}</p>${["reference", "webgpu", ...(!r.pass ? ["diff"] : [])].map((kind) => `<figure><figcaption>${kind}</figcaption><img loading="lazy" src="${r.id}.${kind}.png"></figure>`).join("")}<pre>${JSON.stringify(r.diagnostics ?? r.error ?? "", null, 2)}</pre></section>`,
    )
    .join("")
await writeFile(new URL("index.html", dir), html)
console.log(
  JSON.stringify(
    {
      ...report,
      results: undefined,
      referenceTests: undefined,
      testsWithoutCircuitDrawCalls: report.testsWithoutCircuitDrawCalls.length,
    },
    null,
    2,
  ),
)
if (
  report.parityFailed ||
  report.referenceFailed ||
  report.testsWithoutCircuitDrawCalls.some((t) => t.path?.includes("/shapes/"))
)
  process.exitCode = 1
