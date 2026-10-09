import { expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Resvg } from "@resvg/resvg-js"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { MeshBuilder } from "../lib/geometry"
import { drawText } from "../lib/text/draw-text"
import { getSvgNoteFont } from "./parity/svg-note-font"

test("PCB note geometry follows SVG text anchors and baselines", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pcb-note-font-"))
  const fontPath = join(directory, "note.otf")
  try {
    // Exercise the same deterministic font setup used by the full parity audit.
    const font = await getSvgNoteFont(fontPath)
    for (const alignment of [
      "center",
      "top_left",
      "top_right",
      "bottom_left",
      "bottom_right",
    ] as const) {
      for (const text of ["Ag", "Ag\nA", "Ag\n\nA", "\nAg", "A\\nA"]) {
        const note = {
          type: "pcb_note_text" as const,
          pcb_note_text_id: "note",
          layer: "top" as const,
          anchor_position: { x: 0, y: 0 },
          anchor_alignment: alignment,
          font: "tscircuit2024" as const,
          font_size: 1,
          color: "white",
          text,
        }
        const svg = convertCircuitJsonToPcbSvg([note], {
          width: 500,
          height: 500,
          viewport: { minX: -5, maxX: 5, minY: -5, maxY: 5 },
          showPcbNotes: true,
          includeVersion: false,
        })
        const element = svg.match(
          /<text\b[^>]*data-type="pcb_note_text"[^>]*>[\s\S]*?<\/text>/,
        )![0]
        const reference = new Resvg(
          `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">${element}</svg>`,
          font.options,
        ).getBBox()!
        for (const yAxis of ["up", "down"] as const) {
          const mesh = new MeshBuilder()
          drawText(mesh, note, yAxis)
          const xs = mesh.vertices
            .filter((_, i) => i % 8 === 0)
            .map((x) => 250 + 50 * x)
          const ys = mesh.vertices
            .filter((_, i) => i % 8 === 1)
            .map((y) => 250 + 50 * y * (yAxis === "up" ? -1 : 1))
          expect(Math.min(...xs)).toBeCloseTo(reference.x, 1)
          expect(Math.max(...xs)).toBeCloseTo(reference.x + reference.width, 1)
          expect(Math.min(...ys)).toBeCloseTo(reference.y, 1)
          expect(Math.max(...ys)).toBeCloseTo(reference.y + reference.height, 1)
        }
      }
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
