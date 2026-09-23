import { expect, test } from "bun:test"
import type { PcbTraceRoutePointTeardrop } from "circuit-json"
import { getTeardropPolygon } from "../lib/get-teardrop-polygon"

const taper: PcbTraceRoutePointTeardrop = {
  route_type: "teardrop",
  start: { x: 0, y: 0 },
  end: { x: 6, y: 0 },
  start_width: 3,
  end_width: 0.5,
  width_interpolation_mode: "linear",
  layer: "top",
}

test("linear taper uses full widths and flat end caps", () => {
  expect(getTeardropPolygon(taper)).toEqual([
    { x: 0, y: 1.5 },
    { x: 6, y: 0.25 },
    { x: 6, y: -0.25 },
    { x: 0, y: -1.5 },
  ])
})
test("smoothstep samples follow the specified profile with a bounded chord error", () => {
  const polygon = getTeardropPolygon({
    ...taper,
    width_interpolation_mode: "smoothstep",
  })
  const left = polygon.slice(0, polygon.length / 2)
  for (let i = 0; i < left.length - 1; i++) {
    const a = left[i]!,
      b = left[i + 1]!
    for (const fraction of [0.25, 0.5, 0.75]) {
      const t = (a.x + (b.x - a.x) * fraction) / 6
      const exact = (3 + (0.5 - 3) * t * t * (3 - 2 * t)) / 2
      expect(
        Math.abs(a.y + (b.y - a.y) * fraction - exact),
      ).toBeLessThanOrEqual(0.001003)
    }
  }
})
test("reversal and rotation preserve the copper region", () => {
  const reverse = getTeardropPolygon({
    ...taper,
    start: taper.end,
    end: taper.start,
    start_width: taper.end_width,
    end_width: taper.start_width,
  })
  const key = (p: { x: number; y: number }) =>
    `${p.x.toFixed(6)},${p.y.toFixed(6)}`
  expect(reverse.map(key).sort()).toEqual(
    getTeardropPolygon(taper).map(key).sort(),
  )
  expect(getTeardropPolygon({ ...taper, end: { x: 0, y: 6 } })).toEqual(
    getTeardropPolygon(taper).map((p) => ({ x: -p.y, y: p.x })),
  )
})
test("degenerate and nonfinite geometry emits no vertices", () => {
  for (const invalid of [
    { end: taper.start },
    { start_width: 0 },
    { end_width: NaN },
    { end: { x: Infinity, y: 0 } },
  ])
    expect(getTeardropPolygon({ ...taper, ...invalid })).toEqual([])
})

import { compileCircuitJson } from "../lib"
import { teardropDemo } from "../site/teardrop-demo"
test("teardrops compile as trace copper on their own layers without diagnostics", () => {
  const scene = compileCircuitJson(teardropDemo)
  expect(scene.diagnostics).toEqual([])
  for (const name of ["top", "bottom", "inner1"]) {
    const layer = scene.layers.find((l) => l.name === name)!
    expect(layer.paint.indices.length).toBeGreaterThan(0)
    expect([...layer.paint.vertices].every(Number.isFinite)).toBe(true)
  }
})
test("standalone teardrops ignore the ordinary-wire interpolation setting", () => {
  const scene = compileCircuitJson([
    {
      type: "pcb_trace",
      pcb_trace_id: "single",
      route_thickness_mode: "interpolated",
      route: [taper],
    },
  ])
  expect(scene.diagnostics).toEqual([])
  expect(scene.layers[0]!.paint.indices.length).toBe(6)
})
