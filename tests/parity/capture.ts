import { createCanvas } from "@napi-rs/canvas"
import * as bunTest from "bun:test"
const { afterAll, mock } = bunTest
import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import "../upstream/circuit-to-canvas/tests/fixtures/preload"
import { CircuitToCanvasDrawer } from "../upstream/circuit-to-canvas/lib/drawer"
const output = resolve(import.meta.dir, "../actual/parity")
mkdirSync(output, { recursive: true })
const cases: any[] = []
const tests: any[] = []
let current: any = {}
const nativeTest = bunTest.test
const test = Object.assign(
  (name: string, callback: (...args: any[]) => any, timeout?: number) => {
    const path = new Error().stack
      ?.match(
        /(?:file:\/\/)?([^\s()]*tests\/upstream\/circuit-to-canvas\/tests\/[^:]*\.test\.ts)/,
      )?.[1]
      ?.split("/tests/upstream/circuit-to-canvas/")[1]
    return nativeTest(
      name,
      async () => {
        const start = cases.length
        current = { currentTestName: name, testPath: path }
        let status = "passed",
          error
        try {
          await callback()
        } catch (e) {
          status = "failed"
          error = String(e)
          throw e
        } finally {
          tests.push({
            name,
            path,
            status,
            error,
            caseIds: cases.slice(start).map((c) => c.id),
          })
        }
      },
      timeout,
    )
  },
  nativeTest,
)
test.each = ((rows: any[]) =>
  (name: string, callback: (...args: any[]) => any) => {
    for (const row of rows)
      test(name.replace("%s", String(row)), () =>
        callback(...(Array.isArray(row) ? row : [row])))
  }) as any
mock.module("bun:test", () => ({ ...bunTest, test }))
const original = CircuitToCanvasDrawer.prototype.drawElements
let depth = 0
CircuitToCanvasDrawer.prototype.drawElements = function (
  elements,
  options = {},
) {
  if (depth) return original.call(this, elements, options)
  const ctx = (this as any).ctx
  const isSvg = typeof ctx.canvas.toBuffer !== "function"
  const canvas = isSvg
    ? createCanvas(ctx.canvas.width, ctx.canvas.height)
    : ctx.canvas
  const state = current
  const id = `case-${String(cases.length).padStart(4, "0")}`
  const c = {
    id,
    testName: state.currentTestName,
    testPath: state.testPath,
    width: canvas.width,
    height: canvas.height,
    elements: structuredClone(elements),
    options: structuredClone(options),
    matrix: { ...this.realToCanvasMat },
    contextTransform: Object.fromEntries(
      ["a", "b", "c", "d", "e", "f"].map((k) => [k, ctx.getTransform()[k]]),
    ),
    globalAlpha: ctx.globalAlpha,
    colorMap: (this as any).colorMap,
  }
  writeFileSync(`${output}/${id}.before.png`, canvas.toBuffer("image/png"))
  depth++
  try {
    original.call(this, elements, options)
    if (isSvg) {
      const copyCtx = canvas.getContext("2d")
      const t = ctx.getTransform()
      copyCtx.setTransform(t.a, t.b, t.c, t.d, t.e, t.f)
      copyCtx.globalAlpha = ctx.globalAlpha
      const copy = new CircuitToCanvasDrawer(copyCtx)
      copy.realToCanvasMat = this.realToCanvasMat
      ;(copy as any).colorMap = (this as any).colorMap
      original.call(copy, elements, options)
    }
  } finally {
    depth--
  }
  writeFileSync(`${output}/${id}.reference.png`, canvas.toBuffer("image/png"))
  cases.push(c)
}
afterAll(() => {
  writeFileSync(`${output}/cases.json`, JSON.stringify(cases))
  writeFileSync(`${output}/tests.json`, JSON.stringify(tests, null, 2))
})

// Direct primitive tests are also exercised through GPU geometry, not omitted.
for (const [file, name, shape] of [
  ["circle", "drawCircle", "circle"],
  ["rect", "drawRect", "rect"],
  ["pill", "drawPill", "pill"],
  ["oval", "drawOval", "oval"],
  ["dimension-line", "drawDimensionLine", "dimension"],
]) {
  const path = resolve(
    import.meta.dir,
    `../upstream/circuit-to-canvas/lib/drawer/shapes/${file}.ts`,
  )
  const module = await import(path)
  const fn = module[name]
  mock.module(path, () => ({
    ...module,
    [name]: (p: any) => {
      if (depth || !current.testPath?.includes("/shapes/")) return fn(p)
      const { ctx, realToCanvasMat, ...params } = p
      const canvas = ctx.canvas,
        id = `case-${String(cases.length).padStart(4, "0")}`
      const c = {
        id,
        testName: current.currentTestName,
        testPath: current.testPath,
        width: canvas.width,
        height: canvas.height,
        primitive: { shape, ...params },
        elements: [],
        options: {},
        matrix: realToCanvasMat,
        contextTransform: Object.fromEntries(
          ["a", "b", "c", "d", "e", "f"].map((k) => [k, ctx.getTransform()[k]]),
        ),
        globalAlpha: ctx.globalAlpha,
      }
      writeFileSync(`${output}/${id}.before.png`, canvas.toBuffer("image/png"))
      depth++
      try {
        fn(p)
      } finally {
        depth--
      }
      writeFileSync(
        `${output}/${id}.reference.png`,
        canvas.toBuffer("image/png"),
      )
      cases.push(c)
    },
  }))
}

for (const [file, name] of [
  ["pcb-soldermask/index", "drawPcbSoldermask"],
  ["pcb-trace/pcb-trace", "drawPcbTrace"],
  ["pcb-soldermask/trace", "processTraceSoldermask"],
]) {
  const path = resolve(
    import.meta.dir,
    `../upstream/circuit-to-canvas/lib/drawer/elements/${file}.ts`,
  )
  const module = await import(path),
    fn = module[name]
  mock.module(path, () => ({
    ...module,
    [name]: (p: any) => {
      if (depth) return fn(p)
      const ctx = p.ctx,
        canvas = ctx.canvas,
        id = `case-${String(cases.length).padStart(4, "0")}`
      const elements = p.elements ?? [
        p.trace,
        ...(p.vias ?? []),
        ...(p.platedHoles ?? []),
      ]
      const mask = name !== "drawPcbTrace"
      const c = {
        id,
        testName: current.currentTestName,
        testPath: current.testPath,
        width: canvas.width,
        height: canvas.height,
        elements,
        options: {
          layers: mask ? ["top_soldermask"] : ["top_copper"],
          drawSoldermask: mask,
          clearDrillHoles: true,
        },
        matrix: p.realToCanvasMat,
        contextTransform: Object.fromEntries(
          ["a", "b", "c", "d", "e", "f"].map((k) => [k, ctx.getTransform()[k]]),
        ),
        globalAlpha: ctx.globalAlpha,
        sourceFunction: name,
      }
      writeFileSync(`${output}/${id}.before.png`, canvas.toBuffer("image/png"))
      depth++
      try {
        fn(p)
      } finally {
        depth--
      }
      writeFileSync(
        `${output}/${id}.reference.png`,
        canvas.toBuffer("image/png"),
      )
      cases.push(c)
    },
  }))
}
