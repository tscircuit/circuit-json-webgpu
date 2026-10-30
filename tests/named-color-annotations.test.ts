import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { compileCircuitJson } from "../lib"

test("named annotation colors compile identically to equivalent hex colors", () => {
  const annotations = [
    {
      type: "pcb_note_text",
      pcb_note_text_id: "note",
      text: "White label",
      font: "tscircuit2024",
      font_size: 1,
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      layer: "top",
      color: "white",
    },
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: "fabrication-text",
      pcb_component_id: "component",
      text: "Red label",
      font: "tscircuit2024",
      font_size: 1,
      anchor_position: { x: 0, y: 2 },
      anchor_alignment: "center",
      layer: "top",
      color: "red",
    },
    {
      type: "pcb_note_line",
      pcb_note_line_id: "note-line",
      x1: 0,
      y1: 4,
      x2: 2,
      y2: 4,
      stroke_width: 0.1,
      layer: "top",
      color: "rebeccapurple",
    },
    {
      type: "pcb_fabrication_note_path",
      pcb_fabrication_note_path_id: "fabrication-path",
      pcb_component_id: "component",
      route: [
        { x: 0, y: 6 },
        { x: 2, y: 6 },
      ],
      stroke_width: 0.1,
      layer: "top",
      color: "transparent",
    },
  ] satisfies CircuitJson
  const hexColors: Record<string, string> = {
    white: "#ffffff",
    red: "#ff0000",
    rebeccapurple: "#663399",
    transparent: "#00000000",
  }

  for (const annotation of annotations) {
    const scene = compileCircuitJson([annotation])
    expect(scene.diagnostics).toEqual([])
    expect(scene.triangleCount).toBeGreaterThan(0)
    expect(scene).toEqual(
      compileCircuitJson([
        { ...annotation, color: hexColors[annotation.color] },
      ]),
    )
  }
})
