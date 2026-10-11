import { fillEvenOdd } from "./fill-even-odd"
import { MeshBuilder, rotate } from "../geometry"
import type { Point } from "../types"
import { getAlphabetLayout } from "circuit-to-canvas/lib/drawer/shapes/text/getAlphabetLayout"
import { getTextGeometry } from "circuit-to-canvas/lib/drawer/shapes/text/getTextStartPosition"
import { drawPcbNoteText } from "./draw-pcb-note-text"

/** PCB notes match SVG text; physical board text uses alphabet outlines. */
export function drawText(
  mesh: MeshBuilder,
  e: Record<string, any>,
  yAxis: "up" | "down" = "up",
  pcbNoteFont?: ArrayBuffer,
) {
  if (e.type === "pcb_note_text")
    return drawPcbNoteText(mesh, e, yAxis, pcbNoteFont)
  const text = String(e.text ?? "")
  if (!text) return
  const c = e.anchor_position ?? e.center ?? { x: e.x ?? 0, y: e.y ?? 0 }
  const fontSize = e.font_size ?? 1
  const layout = getAlphabetLayout(text, fontSize)
  const geometry = getTextGeometry(
    e.anchor_alignment ?? "center",
    layout,
    fontSize,
  )
  const isFabrication = e.type === "pcb_fabrication_note_text"
  const mirrored = isFabrication
    ? false
    : e.type === "pcb_silkscreen_text"
      ? e.layer === "bottom"
      : (e.is_mirrored ?? e.layer === "bottom")
  const rotation = isFabrication ? 0 : (e.ccw_rotation ?? 0)
  const sign = yAxis === "up" ? -1 : 1
  const transform = (p: Point) =>
    rotate(
      { x: c.x + (mirrored ? -p.x : p.x), y: c.y + sign * p.y },
      c,
      -sign * rotation,
    )
  if (e.is_knockout && !isFabrication) {
    const b = geometry.bounds
    if (!b) return
    const p = {
      left: 0.2,
      right: 0.2,
      top: 0.2,
      bottom: 0.2,
      ...e.knockout_padding,
    }
    const outer = [
      { x: b.minX - p.left, y: b.minY - p.top },
      { x: b.maxX + p.right, y: b.minY - p.top },
      { x: b.maxX + p.right, y: b.maxY + p.bottom },
      { x: b.minX - p.left, y: b.maxY + p.bottom },
    ]
    fillEvenOdd(mesh, [
      outer.map(transform),
      ...geometry.glyphGroups.flatMap((group) =>
        group.map((ring) => ring.map(transform)),
      ),
    ])
    return
  }
  // Alphabet outlines describe the union of each glyph's round strokes. Filling
  // once avoids alpha accumulating at segment joins in translucent note text.
  for (const group of geometry.glyphGroups)
    fillEvenOdd(
      mesh,
      group.map((ring) => ring.map(transform)),
    )
}
