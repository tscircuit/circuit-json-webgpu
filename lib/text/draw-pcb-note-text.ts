import { parse, type Font, type Glyph, type PathCommand } from "opentype.js"
import type { MeshBuilder } from "../geometry"
import type { Point } from "../types"
import { fillEvenOdd } from "./fill-even-odd"
import { noteFontData } from "./note-font-data"

type NoteFont = { font: Font; outlines: Map<number, Point[][]> }
let defaultFont: NoteFont | undefined
const customFonts = new WeakMap<ArrayBuffer, NoteFont>()

function getFont(data?: ArrayBuffer): NoteFont {
  if (data) {
    let cached = customFonts.get(data)
    if (!cached) {
      cached = { font: parse(data), outlines: new Map() }
      customFonts.set(data, cached)
    }
    return cached
  }
  return (defaultFont ??= {
    font: parse(
      Uint8Array.from(atob(noteFontData), (char) => char.charCodeAt(0)).buffer,
    ),
    outlines: new Map(),
  })
}

// Flatten in em units, once per glyph. Camera changes keep the same GPU mesh.
function getOutline(glyph: Glyph, outlines: Map<number, Point[][]>): Point[][] {
  const cached = outlines.get(glyph.index)
  if (cached) return cached
  const rings: Point[][] = []
  let ring: Point[] = []
  const finish = () => {
    if (ring.length > 2) rings.push(ring)
    ring = []
  }
  for (const command of glyph.getPath(0, 0, 1).commands) {
    if (command.type === "M") {
      finish()
      ring.push({ x: command.x, y: command.y })
    } else if (command.type === "L") {
      ring.push({ x: command.x, y: command.y })
    } else if (command.type === "Z") {
      finish()
    } else {
      flattenCurve(ring, command)
    }
  }
  finish()
  outlines.set(glyph.index, rings)
  return rings
}

function flattenCurve(
  ring: Point[],
  command: Extract<PathCommand, { type: "C" | "Q" }>,
) {
  const start = ring.at(-1)!
  const points = [start, { x: command.x1, y: command.y1 }]
  if (command.type === "C") points.push({ x: command.x2, y: command.y2 })
  points.push({ x: command.x, y: command.y })
  const subdivide = (points: Point[], depth = 0) => {
    const a = points[0],
      b = points.at(-1)!
    const length = Math.hypot(b.x - a.x, b.y - a.y)
    const flatness = Math.max(
      ...points
        .slice(1, -1)
        .map((p) =>
          length
            ? Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) /
              length
            : Math.hypot(p.x - a.x, p.y - a.y),
        ),
    )
    if (flatness <= 1 / 2048 || depth >= 12) {
      ring.push(b)
      return
    }
    const left = [a],
      right = [b]
    let level = points
    while (level.length > 1) {
      level = level.slice(1).map((p, i) => ({
        x: (level[i].x + p.x) / 2,
        y: (level[i].y + p.y) / 2,
      }))
      left.push(level[0])
      right.unshift(level.at(-1)!)
    }
    subdivide(left, depth + 1)
    subdivide(right, depth + 1)
  }
  subdivide(points)
}

/** Match circuit-to-svg's Arial metrics, text-anchor, and first-line baseline. */
export function drawPcbNoteText(
  mesh: MeshBuilder,
  note: Record<string, any>,
  yAxis: "up" | "down",
  fontData?: ArrayBuffer,
) {
  const text = String(note.text ?? "")
  if (!text) return
  const { font, outlines } = getFont(fontData)
  const fontSize = note.font_size ?? 1
  const anchor = note.anchor_position ??
    note.center ?? { x: note.x ?? 0, y: note.y ?? 0 }
  const alignment = note.anchor_alignment ?? "center"
  const baseline =
    ((alignment.startsWith("top_")
      ? font.ascender
      : alignment.startsWith("bottom_")
        ? font.descender
        : (font.ascender + font.descender) / 2) /
      font.unitsPerEm) *
    fontSize
  const sign = yAxis === "up" ? -1 : 1
  let y = baseline
  for (const [index, line] of text.split("\n").entries()) {
    // An empty SVG tspan has no positioned characters, so its dy is ignored.
    if (!line) continue
    if (index > 0) y += fontSize
    const width = font.getAdvanceWidth(line, fontSize)
    const x = alignment.endsWith("_left")
      ? 0
      : alignment.endsWith("_right")
        ? -width
        : -width / 2
    font.forEachGlyph(line, x, y, fontSize, {}, (glyph, x, y) => {
      fillEvenOdd(
        mesh,
        getOutline(glyph, outlines).map((ring) =>
          ring.map((p) => ({
            x: anchor.x + x + p.x * fontSize,
            y: anchor.y + sign * (y + p.y * fontSize),
          })),
        ),
      )
    })
  }
}
