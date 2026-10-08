import { expect, test } from "bun:test"
import type { PcbNoteText } from "circuit-json"
import { compileCircuitJson } from "../lib/compile-circuit"
import { MeshBuilder } from "../lib/geometry"
import { drawText } from "../lib/text/draw-text"
import { fillEvenOdd } from "../lib/text/fill-even-odd"

test("named white PCB notes compile like hex white on both board sides", () => {
  for (const layer of ["top", "bottom"] as const) {
    const note: PcbNoteText = {
      type: "pcb_note_text",
      pcb_note_text_id: "tenting_legend",
      layer,
      text: "Board via tenting",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 1,
      color: "white",
    }
    const scene = compileCircuitJson([note])
    const hexScene = compileCircuitJson([{ ...note, color: "#ffffff" }])
    expect(scene.diagnostics).toEqual([])
    expect(scene.triangleCount).toBeGreaterThan(0)
    expect(scene).toEqual(hexScene)
    const paint = scene.layers.find((l) => l.name === `${layer}_notes`)!.paint
    for (let i = 0; i < paint.vertices.length; i += 8) {
      expect([...paint.vertices.slice(i + 2, i + 6)]).toEqual([1, 1, 1, 1])
    }
  }
})

function mesh(text: string, extra: Record<string, unknown> = {}) {
  const m = new MeshBuilder()
  drawText(m, {
    type: "pcb_copper_text",
    text,
    font_size: 10,
    layer: "top",
    anchor_position: { x: 0, y: 0 },
    ...extra,
  })
  return m.build()
}
function bounds(m: ReturnType<typeof mesh>) {
  const x = [],
    y = []
  for (let i = 0; i < m.vertices.length; i += 8) {
    x.push(m.vertices[i])
    y.push(m.vertices[i + 1])
  }
  return {
    minX: Math.min(...x),
    maxX: Math.max(...x),
    minY: Math.min(...y),
    maxY: Math.max(...y),
  }
}
function area(m: ReturnType<typeof mesh>) {
  let sum = 0
  for (let i = 0; i < m.indices.length; i += 3) {
    const [a, b, c] = Array.from(m.indices.slice(i, i + 3), (v) => ({
      x: m.vertices[v * 8],
      y: m.vertices[v * 8 + 1],
    }))
    sum += Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2
  }
  return sum
}
test("uses proportional glyph advances and preserves lowercase", () => {
  const w = bounds(mesh("WWW")),
    i = bounds(mesh("iii"))
  expect(w.maxX - w.minX).toBeGreaterThan(i.maxX - i.minX)
  expect(Array.from(mesh("g").vertices)).not.toEqual(
    Array.from(mesh("G").vertices),
  )
})
test("anchors actual ink bounds at all nine positions", () => {
  for (const v of ["top", "center", "bottom"])
    for (const h of ["left", "center", "right"]) {
      const anchor = v === "center" && h === "center" ? "center" : `${v}_${h}`
      const b = bounds(mesh("ag!\nWi", { anchor_alignment: anchor }))
      expect(
        h === "left" ? b.minX : h === "right" ? b.maxX : (b.minX + b.maxX) / 2,
      ).toBeCloseTo(0, 4)
      expect(
        v === "top" ? b.maxY : v === "bottom" ? b.minY : (b.minY + b.maxY) / 2,
      ).toBeCloseTo(0, 4)
    }
})
test("literal newline escapes match real multiline text", () => {
  expect(Array.from(mesh("left\\nright").vertices)).toEqual(
    Array.from(mesh("left\nright").vertices),
  )
})
test("bottom copper mirrors unless explicitly overridden", () => {
  const top = mesh("abc", { anchor_alignment: "center_left" }),
    bottom = mesh("abc", { anchor_alignment: "center_left", layer: "bottom" })
  for (let i = 0; i < top.vertices.length; i += 8) {
    expect(bottom.vertices[i]).toBeCloseTo(-top.vertices[i], 5)
    expect(bottom.vertices[i + 1]).toBeCloseTo(top.vertices[i + 1], 5)
  }
  expect(
    Array.from(mesh("abc", { layer: "bottom", is_mirrored: false }).vertices),
  ).toEqual(Array.from(mesh("abc").vertices))
})
test("evenodd tessellation preserves disconnected contours and nested counters", () => {
  const rect = (x: number, y: number, w: number, h: number) => [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ]
  const m = new MeshBuilder()
  fillEvenOdd(m, [
    rect(0, 0, 10, 10),
    rect(2, 2, 6, 6),
    rect(4, 4, 2, 2),
    rect(20, 0, 2, 2),
  ])
  expect(area(m.build())).toBeCloseTo(100 - 36 + 4 + 4, 5)
})
test("knockout preserves glyph counters and padding", () => {
  const normal = mesh("B!"),
    b = bounds(normal),
    knockout = mesh("B!", {
      is_knockout: true,
      knockout_padding: { left: 1, right: 2, top: 3, bottom: 4 },
    })
  expect(area(knockout) + area(normal)).toBeCloseTo(
    (b.maxX - b.minX + 3) * (b.maxY - b.minY + 7),
    3,
  )
})
