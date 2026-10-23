import { expect, test } from "bun:test"
import { pcb_note_line } from "circuit-json"
import { compileCircuitJson } from "../lib"
import { meshCovers } from "./fixtures/mesh-geometry"

test("dashed PCB note lines preserve empty gaps in every direction", () => {
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [0.6, 0.8],
  ]) {
    const line = pcb_note_line.parse({
      type: "pcb_note_line",
      pcb_note_line_id: "dashed-note",
      layer: "bottom",
      x1: 2,
      y1: -3,
      x2: 2 + dx * 0.95,
      y2: -3 + dy * 0.95,
      stroke_width: 0.04,
      color: "#00ffff",
      is_dashed: true,
    })
    const original = structuredClone(line)
    const scene = compileCircuitJson([line])
    expect(scene.diagnostics).toEqual([])
    expect(scene.layers.map((layer) => layer.name)).toEqual(["bottom_notes"])
    const mesh = scene.layers[0].paint
    // SVG's pattern is 0.2 mm on, 0.1 mm off. Sample the dash and gap centres.
    for (const distance of [0.1, 0.4, 0.7, 0.925]) {
      expect(
        meshCovers({
          mesh,
          point: { x: line.x1 + dx * distance, y: line.y1 + dy * distance },
        }),
      ).toBe(true)
    }
    for (const distance of [0.25, 0.55, 0.85, 1]) {
      expect(
        meshCovers({
          mesh,
          point: { x: line.x1 + dx * distance, y: line.y1 + dy * distance },
        }),
      ).toBe(false)
    }
    const solid = compileCircuitJson([{ ...line, is_dashed: false }]).layers[0]
      .paint
    expect(
      meshCovers({
        mesh: solid,
        point: { x: line.x1 + dx * 0.25, y: line.y1 + dy * 0.25 },
      }),
    ).toBe(true)
    expect(line).toEqual(original)
  }
})
