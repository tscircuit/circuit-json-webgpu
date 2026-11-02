import { expect, test } from "bun:test"
import { compileCircuitJson } from "../lib"
import type { Color } from "../lib/types"

test("annotation colors preserve CSS names, hexadecimal, RGB, and alpha", () => {
  const colors: Array<{ cssColor: string; rgbaColor: Color }> = [
    { cssColor: "white", rgbaColor: [1, 1, 1, 1] },
    { cssColor: "rebeccapurple", rgbaColor: [0.4, 0.2, 0.6, 1] },
    { cssColor: "transparent", rgbaColor: [0, 0, 0, 0] },
    { cssColor: "#f008", rgbaColor: [1, 0, 0, 136 / 255] },
    { cssColor: "rgba(255, 0, 128, 0.5)", rgbaColor: [1, 0, 128 / 255, 0.5] },
  ]
  for (const { cssColor, rgbaColor } of colors) {
    const scene = compileCircuitJson([
      {
        type: "pcb_note_text",
        pcb_note_text_id: "annotation",
        text: "GND",
        font: "tscircuit2024",
        font_size: 2,
        anchor_position: { x: 0, y: 0 },
        anchor_alignment: "center",
        layer: "top",
        color: cssColor,
      },
    ])
    expect(scene.diagnostics).toEqual([])
    const notes = scene.layers.find((layer) => layer.name === "top_notes")!
    expect(notes.paint.indices.length).toBeGreaterThan(0)
    for (let channel = 0; channel < 4; channel++) {
      expect(notes.paint.vertices[channel + 2]).toBeCloseTo(
        rgbaColor[channel],
        6,
      )
    }
  }
})
