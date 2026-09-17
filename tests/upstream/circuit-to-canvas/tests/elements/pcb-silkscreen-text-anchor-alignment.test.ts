import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbSilkscreenText } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw silkscreen text with different anchor alignments on top and bottom layers", async () => {
  const SCALE = 4
  const canvas = createCanvas(400 * SCALE, 300 * SCALE)
  const ctx = canvas.getContext("2d")
  ctx.scale(SCALE, SCALE)
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, canvas.width / SCALE, canvas.height / SCALE)

  // Draw reference lines
  ctx.strokeStyle = "#444444"
  ctx.lineWidth = 0.5
  // Horizontal lines
  ctx.beginPath()
  ctx.moveTo(10, 50)
  ctx.lineTo(390, 50)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(10, 150)
  ctx.lineTo(390, 150)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(10, 250)
  ctx.lineTo(390, 250)
  ctx.stroke()
  // Vertical lines
  ctx.beginPath()
  ctx.moveTo(100, 10)
  ctx.lineTo(100, 290)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(200, 10)
  ctx.lineTo(200, 290)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(300, 10)
  ctx.lineTo(300, 290)
  ctx.stroke()

  const elements: PcbSilkscreenText[] = [
    // Top layer tests
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "top-top-left",
      pcb_component_id: "component1",
      layer: "top",
      text: "TL",
      anchor_position: { x: 100, y: 50 },
      anchor_alignment: "top_left",
      font: "tscircuit2024",
      font_size: 12,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "top-center",
      pcb_component_id: "component1",
      layer: "top",
      text: "TC",
      anchor_position: { x: 200, y: 50 },
      anchor_alignment: "top_center",
      font: "tscircuit2024",
      font_size: 12,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "top-top-right",
      pcb_component_id: "component1",
      layer: "top",
      text: "TR",
      anchor_position: { x: 300, y: 50 },
      anchor_alignment: "top_right",
      font: "tscircuit2024",
      font_size: 12,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "top-center-left",
      pcb_component_id: "component1",
      layer: "top",
      text: "CL",
      anchor_position: { x: 100, y: 150 },
      anchor_alignment: "center_left",
      font: "tscircuit2024",
      font_size: 12,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "top-center",
      pcb_component_id: "component1",
      layer: "top",
      text: "C",
      anchor_position: { x: 200, y: 150 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 12,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "top-center-right",
      pcb_component_id: "component1",
      layer: "top",
      text: "CR",
      anchor_position: { x: 300, y: 150 },
      anchor_alignment: "center_right",
      font: "tscircuit2024",
      font_size: 12,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "top-bottom-left",
      pcb_component_id: "component1",
      layer: "top",
      text: "BL",
      anchor_position: { x: 100, y: 250 },
      anchor_alignment: "bottom_left",
      font: "tscircuit2024",
      font_size: 12,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "top-bottom-center",
      pcb_component_id: "component1",
      layer: "top",
      text: "BC",
      anchor_position: { x: 200, y: 250 },
      anchor_alignment: "bottom_center",
      font: "tscircuit2024",
      font_size: 12,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "top-bottom-right",
      pcb_component_id: "component1",
      layer: "top",
      text: "BR",
      anchor_position: { x: 300, y: 250 },
      anchor_alignment: "bottom_right",
      font: "tscircuit2024",
      font_size: 12,
    },
    // Bottom layer tests (should appear mirrored horizontally)
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "bottom-top-left",
      pcb_component_id: "component1",
      layer: "bottom",
      text: "BL-TL",
      anchor_position: { x: 50, y: 50 },
      anchor_alignment: "top_left",
      font: "tscircuit2024",
      font_size: 10,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "bottom-top-right",
      pcb_component_id: "component1",
      layer: "bottom",
      text: "BL-TR",
      anchor_position: { x: 350, y: 50 },
      anchor_alignment: "top_right",
      font: "tscircuit2024",
      font_size: 10,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "bottom-center-left",
      pcb_component_id: "component1",
      layer: "bottom",
      text: "BL-CL",
      anchor_position: { x: 50, y: 150 },
      anchor_alignment: "center_left",
      font: "tscircuit2024",
      font_size: 10,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "bottom-center-right",
      pcb_component_id: "component1",
      layer: "bottom",
      text: "BL-CR",
      anchor_position: { x: 350, y: 150 },
      anchor_alignment: "center_right",
      font: "tscircuit2024",
      font_size: 10,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "bottom-bottom-left",
      pcb_component_id: "component1",
      layer: "bottom",
      text: "BL-BL",
      anchor_position: { x: 50, y: 250 },
      anchor_alignment: "bottom_left",
      font: "tscircuit2024",
      font_size: 10,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "bottom-bottom-right",
      pcb_component_id: "component1",
      layer: "bottom",
      text: "BL-BR",
      anchor_position: { x: 350, y: 250 },
      anchor_alignment: "bottom_right",
      font: "tscircuit2024",
      font_size: 10,
    },
  ]

  drawer.drawElements(elements)

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
