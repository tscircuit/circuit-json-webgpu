import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbPlatedHole } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw plated holes with positive and negative soldermask margins", async () => {
  const canvas = createCanvas(800, 600)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 800, 600)

  const circuit: any = [
    {
      type: "pcb_board",
      pcb_board_id: "board0",
      center: { x: 0, y: 0 },
      width: 16,
      height: 14,
    },
    // Circle with positive margin (mask extends beyond pad)
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "hole_circle_positive",
      shape: "circle",
      x: -5,
      y: 3.5,
      outer_diameter: 2,
      hole_diameter: 1,
      layers: ["top", "bottom"],

      soldermask_margin: 0.2,
    },
    // Circle with negative margin (spacing around copper, copper visible)
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "hole_circle_negative",
      shape: "circle",
      x: -5,
      y: -3.5,
      outer_diameter: 2,
      hole_diameter: 1,
      layers: ["top", "bottom"],

      soldermask_margin: -0.15,
    },
    // Oval with positive margin
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "hole_oval_positive",
      shape: "oval",
      x: 0,
      y: 3.5,
      outer_width: 2.4,
      outer_height: 1.6,
      hole_width: 1.6,
      hole_height: 0.8,
      layers: ["top", "bottom"],
      ccw_rotation: 0,

      soldermask_margin: 0.15,
    },
    // Oval with negative margin
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "hole_oval_negative",
      shape: "oval",
      x: 0,
      y: -3.5,
      outer_width: 2.4,
      outer_height: 1.6,
      hole_width: 1.6,
      hole_height: 0.8,
      layers: ["top", "bottom"],
      ccw_rotation: 0,

      soldermask_margin: -0.2,
    },
    // Pill with positive margin
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "hole_pill_positive",
      shape: "pill",
      x: 5,
      y: 3.5,
      outer_width: 3,
      outer_height: 1.5,
      hole_width: 2,
      hole_height: 1,
      layers: ["top", "bottom"],
      ccw_rotation: 0,

      soldermask_margin: 0.1,
    },
    // Pill with negative margin
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "hole_pill_negative",
      shape: "pill",
      x: 5,
      y: -3.5,
      outer_width: 3,
      outer_height: 1.5,
      hole_width: 2,
      hole_height: 1,
      layers: ["top", "bottom"],
      ccw_rotation: 0,

      soldermask_margin: -0.12,
    },
    // Rectangular pad with circular hole - positive margin
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "hole_rect_circle_positive",
      shape: "circular_hole_with_rect_pad",
      x: -2.5,
      y: 0,
      rect_pad_width: 2.4,
      rect_pad_height: 1.6,
      rect_border_radius: 0.2,
      hole_diameter: 1,
      layers: ["top", "bottom"],

      soldermask_margin: 0.15,
    },
    // Rectangular pad with circular hole - negative margin
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "hole_rect_circle_negative",
      shape: "circular_hole_with_rect_pad",
      x: 2.5,
      y: 0,
      rect_pad_width: 2.4,
      rect_pad_height: 1.6,
      rect_border_radius: 0.2,
      hole_diameter: 1,
      layers: ["top", "bottom"],

      soldermask_margin: -0.1,
    },
    // Silkscreen labels for positive margin holes (top row)
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_circle_pos",
      layer: "top",
      anchor_position: { x: -5, y: 5.2 },
      anchor_alignment: "center",
      text: "+0.2mm",
      font_size: 0.4,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_oval_pos",
      layer: "top",
      anchor_position: { x: 0, y: 5.2 },
      anchor_alignment: "center",
      text: "+0.15mm",
      font_size: 0.4,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_pill_pos",
      layer: "top",
      anchor_position: { x: 5, y: 5.2 },
      anchor_alignment: "center",
      text: "+0.1mm",
      font_size: 0.4,
    },
    // Silkscreen labels for middle row (rectangular pads)
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_rect_pos",
      layer: "top",
      anchor_position: { x: -2.5, y: 1.8 },
      anchor_alignment: "center",
      text: "+0.15mm",
      font_size: 0.4,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_rect_neg",
      layer: "top",
      anchor_position: { x: 2.5, y: -1.8 },
      anchor_alignment: "center",
      text: "-0.1mm",
      font_size: 0.4,
    },
    // Silkscreen labels for negative margin holes (bottom row)
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_circle_neg",
      layer: "top",
      anchor_position: { x: -5, y: -5.2 },
      anchor_alignment: "center",
      text: "-0.15mm",
      font_size: 0.4,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_oval_neg",
      layer: "top",
      anchor_position: { x: 0, y: -5.2 },
      anchor_alignment: "center",
      text: "-0.2mm",
      font_size: 0.4,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_pill_neg",
      layer: "top",
      anchor_position: { x: 5, y: -5.2 },
      anchor_alignment: "center",
      text: "-0.12mm",
      font_size: 0.4,
    },
  ]

  drawer.setCameraBounds({ minX: -8, maxX: 8, minY: -6.5, maxY: 6.5 })
  drawer.drawElements(circuit, {
    drawSoldermask: true,
    drawBoardMaterial: true,
  })

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
