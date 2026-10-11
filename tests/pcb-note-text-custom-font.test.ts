import { expect, test } from "bun:test"
import type { PcbNoteText } from "circuit-json"
import { parse } from "opentype.js"
import { compileCircuitJson } from "../lib"
import { noteFontData } from "../lib/text/note-font-data"

test("custom PCB note fonts are retained without changing the default font", () => {
  const note: PcbNoteText = {
    type: "pcb_note_text",
    pcb_note_text_id: "note",
    text: "AA",
    font: "tscircuit2024",
    font_size: 1,
    layer: "top",
    anchor_position: { x: 0, y: 0 },
    anchor_alignment: "center",
    color: "white",
  }
  const original = compileCircuitJson([note])
  const font = parse(
    Uint8Array.from(atob(noteFontData), (c) => c.charCodeAt(0)).buffer,
  )
  const glyph = font.charToGlyph("A")
  const extraAdvance = glyph.advanceWidth! / font.unitsPerEm
  glyph.advanceWidth! *= 2
  const pcbNoteFont = font.toArrayBuffer()
  const custom = compileCircuitJson([note], { pcbNoteFont })
  const width = (scene: typeof original) => {
    const xs = scene.layers[0].paint.vertices.filter((_, i) => i % 8 === 0)
    return Math.max(...xs) - Math.min(...xs)
  }
  expect(original.diagnostics).toEqual([])
  expect(custom.diagnostics).toEqual([])
  expect(width(custom) - width(original)).toBeCloseTo(extraAdvance, 5)
  expect(compileCircuitJson([note], { pcbNoteFont })).toEqual(custom)
  expect(compileCircuitJson([note])).toEqual(original)
})
