import { expect, test } from "bun:test"
import { MeshBuilder } from "../lib/geometry"
import { drawText } from "../lib/text/draw-text"

test("multiline PCB text advances by one font size, including blank lines", () => {
  for (const type of [
    "pcb_note_text",
    "pcb_fabrication_note_text",
    "pcb_silkscreen_text",
    "pcb_copper_text",
  ]) {
    for (const fontSize of [1, 2.4]) {
      for (const yAxis of ["up", "down"] as const) {
        const bounds = (text: string) => {
          const mesh = new MeshBuilder()
          drawText(
            mesh,
            {
              type,
              text,
              font_size: fontSize,
              anchor_position: { x: 0, y: 0 },
              anchor_alignment: "center",
              layer: "top",
            },
            yAxis,
          )
          const y = mesh.vertices.filter((_, index) => index % 8 === 1)
          return { minY: Math.min(...y), maxY: Math.max(...y) }
        }
        const single = bounds("A")
        for (const [text, advances] of [
          ["A\nA", 1],
          ["A\\nA", 1],
          ["A\n\nA", 2],
        ] as const) {
          const multiline = bounds(text)
          expect(
            multiline.maxY - multiline.minY - (single.maxY - single.minY),
          ).toBeCloseTo(advances * fontSize, 6)
          expect((multiline.minY + multiline.maxY) / 2).toBeCloseTo(0, 6)
        }
      }
    }
  }
})
