import { expect, test } from "bun:test"
import { MeshBuilder } from "../lib/geometry"
import { drawText } from "../lib/text/draw-text"

test("PCB notes use SVG first-line anchoring and one-em tspan advances", () => {
  for (const fontSize of [1, 2.4]) {
    for (const yAxis of ["up", "down"] as const) {
      const bounds = (text: string) => {
        const mesh = new MeshBuilder()
        drawText(
          mesh,
          {
            type: "pcb_note_text",
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
        ["A\nA\nA", 2],
        ["A\n\nA", 1],
      ] as const) {
        const multiline = bounds(text)
        expect(
          multiline.maxY - multiline.minY - (single.maxY - single.minY),
        ).toBeCloseTo(advances * fontSize, 6)
        expect(yAxis === "up" ? multiline.maxY : multiline.minY).toBeCloseTo(
          yAxis === "up" ? single.maxY : single.minY,
          6,
        )
      }
    }
  }
})
