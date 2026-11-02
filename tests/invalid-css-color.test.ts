import { expect, test } from "bun:test"
import { compileCircuitJson } from "../lib"

test("invalid annotation colors still report a diagnostic", () => {
  const scene = compileCircuitJson([
    {
      type: "pcb_note_text",
      pcb_note_text_id: "invalid_color",
      text: "GND",
      font: "tscircuit2024",
      font_size: 2,
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      layer: "top",
      color: "invalid-css-color",
    },
  ])
  expect(scene.diagnostics).toHaveLength(1)
  expect(scene.diagnostics[0].elementId).toBe("invalid_color")
  expect(scene.diagnostics[0].message).toContain("invalid-css-color")
})
