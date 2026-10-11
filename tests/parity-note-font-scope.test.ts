import { expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Resvg } from "@resvg/resvg-js"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { parse } from "opentype.js"
import { getSvgNoteFont, renderSvgReference } from "./parity/svg-note-font"

test("PCB note fonts preserve other SVG reference text rendering", async () => {
  const directory = await mkdtemp(join(tmpdir(), "parity-note-font-"))
  try {
    const path = join(directory, "note.otf")
    const { data, options } = await getSvgNoteFont(path)
    // Deliberately widen the note font so a global override cannot go unnoticed.
    const font = parse(Uint8Array.from(data).buffer)
    font.charToGlyph("A").advanceWidth = font.unitsPerEm * 2
    await writeFile(path, Buffer.from(font.toArrayBuffer()))

    const text = {
      text: "AAAA",
      font_size: 1,
      font: "tscircuit2024",
      layer: "top",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
    } as const
    const elements: Parameters<typeof convertCircuitJsonToPcbSvg>[0] = [
      { ...text, type: "pcb_note_text", pcb_note_text_id: "note" },
      {
        ...text,
        type: "pcb_silkscreen_text",
        pcb_silkscreen_text_id: "silk",
        pcb_component_id: "component",
      },
      {
        ...text,
        type: "pcb_fabrication_note_text",
        pcb_fabrication_note_text_id: "fab",
        pcb_component_id: "component",
      },
      {
        ...text,
        type: "pcb_note_dimension",
        pcb_note_dimension_id: "dimension",
        from: { x: -4, y: 0 },
        to: { x: 4, y: 0 },
        arrow_size: 0.2,
      },
    ]
    for (const element of elements) {
      const svg = convertCircuitJsonToPcbSvg([element], {
        width: 400,
        height: 200,
        viewport: { minX: -10, maxX: 10, minY: -5, maxY: 5 },
        layer: "top",
        showPcbNotes: true,
        includeVersion: false,
        drawPaddingOutsideBoard: false,
      })
      const original = new Resvg(svg).render().asPng()
      const custom = new Resvg(svg, options).render().asPng()
      expect(custom.equals(original)).toBe(false)
      const actual = renderSvgReference(svg, [element], options)
      expect(
        actual.equals(element.type === "pcb_note_text" ? custom : original),
      ).toBe(true)
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
