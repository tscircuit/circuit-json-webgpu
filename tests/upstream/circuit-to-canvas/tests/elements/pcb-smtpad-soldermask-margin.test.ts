import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw smt pads with positive and negative soldermask margins", async () => {
  const canvas = createCanvas(800, 600)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 800, 600)

  const circuit: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board0",
      center: { x: 0, y: 0 },
      width: 14,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    // Rectangle with positive margin (mask extends beyond pad)
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rect_positive",
      shape: "rect",
      layer: "top",
      x: -4,
      y: 2,
      width: 1.6,
      height: 1.1,
      soldermask_margin: 0.2,
    },
    // Rectangle with negative margin (spacing around copper, copper visible)
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rect_negative",
      shape: "rect",
      layer: "top",
      x: -4,
      y: -2,
      width: 1.6,
      height: 1.1,
      soldermask_margin: -0.15,
    },
    // Circle with positive margin
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_circle_positive",
      shape: "circle",
      layer: "top",
      x: 0,
      y: 2,
      radius: 0.75,
      soldermask_margin: 0.15,
    },
    // Circle with negative margin
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_circle_negative",
      shape: "circle",
      layer: "top",
      x: 0,
      y: -2,
      radius: 0.75,
      soldermask_margin: -0.2,
    },
    // Pill with positive margin
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_pill_positive",
      shape: "pill",
      layer: "top",
      x: 4,
      y: 2,
      width: 2.4,
      height: 1,
      radius: 0.5,
      soldermask_margin: 0.1,
    },
    // Pill with negative margin
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_pill_negative",
      shape: "pill",
      layer: "top",
      x: 4,
      y: -2,
      width: 2.4,
      height: 1,
      radius: 0.5,
      soldermask_margin: -0.12,
    },
    // Silkscreen labels for positive margin pads (top row)
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_rect_pos",
      pcb_component_id: "comp1",
      layer: "top",
      anchor_position: { x: -4, y: 3.2 },
      anchor_alignment: "center",
      text: "+0.2mm",
      font_size: 0.4,
      font: "tscircuit2024",
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_circle_pos",
      pcb_component_id: "comp1",
      layer: "top",
      anchor_position: { x: 0, y: 3.2 },
      anchor_alignment: "center",
      text: "+0.15mm",
      font_size: 0.4,
      font: "tscircuit2024",
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_pill_pos",
      pcb_component_id: "comp1",
      layer: "top",
      anchor_position: { x: 4, y: 3.2 },
      anchor_alignment: "center",
      text: "+0.1mm",
      font_size: 0.4,
      font: "tscircuit2024",
    },
    // Silkscreen labels for negative margin pads (bottom row)
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_rect_neg",
      pcb_component_id: "comp1",
      layer: "top",
      anchor_position: { x: -4, y: -3.2 },
      anchor_alignment: "center",
      text: "-0.15mm",
      font_size: 0.4,
      font: "tscircuit2024",
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_circle_neg",
      pcb_component_id: "comp1",
      layer: "top",
      anchor_position: { x: 0, y: -3.2 },
      anchor_alignment: "center",
      text: "-0.2mm",
      font_size: 0.4,
      font: "tscircuit2024",
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_pill_neg",
      pcb_component_id: "comp1",
      layer: "top",
      anchor_position: { x: 4, y: -3.2 },
      anchor_alignment: "center",
      text: "-0.12mm",
      font_size: 0.4,
      font: "tscircuit2024",
    },
  ]

  drawer.setCameraBounds({ minX: -7, maxX: 7, minY: -5, maxY: 5 })
  drawer.drawElements(circuit, {
    drawSoldermask: true,
    drawBoardMaterial: true,
  })

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
