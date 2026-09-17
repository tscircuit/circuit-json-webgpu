import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw holes with positive and negative soldermask margins", async () => {
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
      width: 14,
      height: 10,
    },
    // Circle with positive margin (mask extends beyond hole)
    {
      type: "pcb_hole",
      pcb_hole_id: "hole_circle_positive",
      hole_shape: "circle",
      x: -4,
      y: 2,
      hole_diameter: 1.0,

      soldermask_margin: 0.2,
    },
    // Circle with negative margin
    {
      type: "pcb_hole",
      pcb_hole_id: "hole_circle_negative",
      hole_shape: "circle",
      x: -4,
      y: -2,
      hole_diameter: 1.0,

      soldermask_margin: -0.15,
    },
    // Square with positive margin
    {
      type: "pcb_hole",
      pcb_hole_id: "hole_square_positive",
      hole_shape: "square",
      x: -1,
      y: 2,
      hole_diameter: 1.0,

      soldermask_margin: 0.15,
    },
    // Square with negative margin
    {
      type: "pcb_hole",
      pcb_hole_id: "hole_square_negative",
      hole_shape: "square",
      x: -1,
      y: -2,
      hole_diameter: 1.0,

      soldermask_margin: -0.1,
    },
    // Oval with positive margin
    {
      type: "pcb_hole",
      pcb_hole_id: "hole_oval_positive",
      hole_shape: "oval",
      x: 2,
      y: 2,
      hole_width: 1.5,
      hole_height: 0.8,

      soldermask_margin: 0.1,
    },
    // Oval with negative margin
    {
      type: "pcb_hole",
      pcb_hole_id: "hole_oval_negative",
      hole_shape: "oval",
      x: 2,
      y: -2,
      hole_width: 1.5,
      hole_height: 0.8,

      soldermask_margin: -0.12,
    },
    // Rect with positive margin
    {
      type: "pcb_hole",
      pcb_hole_id: "hole_rect_positive",
      hole_shape: "rect",
      x: 5,
      y: 2,
      hole_width: 1.5,
      hole_height: 0.8,

      soldermask_margin: 0.15,
    },
    // Pill with positive margin
    {
      type: "pcb_hole",
      pcb_hole_id: "hole_pill_positive",
      hole_shape: "pill",
      x: -2.5,
      y: 0,
      hole_width: 1.5,
      hole_height: 0.8,

      soldermask_margin: 0.1,
    },
    // Pill with negative margin
    {
      type: "pcb_hole",
      pcb_hole_id: "hole_pill_negative",
      hole_shape: "pill",
      x: -2.5,
      y: -4,
      hole_width: 1.5,
      hole_height: 0.8,

      soldermask_margin: -0.08,
    },
    // Pill with negative margin
    {
      type: "pcb_hole",
      pcb_hole_id: "hole_pill_negative",
      hole_shape: "pill",
      x: -2.5,
      y: -4,
      hole_width: 1.5,
      hole_height: 0.8,

      soldermask_margin: -0.08,
    },
    // Circle with positive margin (mask extends beyond hole)
    {
      type: "pcb_hole",
      pcb_hole_id: "hole_circle_positive",
      hole_shape: "circle",
      x: -4,
      y: 2,
      hole_diameter: 1.0,

      soldermask_margin: 0.2,
    },
    // Square with positive margin
    {
      type: "pcb_hole",
      pcb_hole_id: "hole_square_positive",
      hole_shape: "square",
      x: -1,
      y: 2,
      hole_diameter: 1.0,

      soldermask_margin: 0.15,
    },
    // Oval with positive margin
    {
      type: "pcb_hole",
      pcb_hole_id: "hole_oval_positive",
      hole_shape: "oval",
      x: 2,
      y: 2,
      hole_width: 1.5,
      hole_height: 0.8,

      soldermask_margin: 0.1,
    },
    // Rect with positive margin
    {
      type: "pcb_hole",
      pcb_hole_id: "hole_rect_positive",
      hole_shape: "rect",
      x: 5,
      y: 2,
      hole_width: 1.6,
      hole_height: 1.1,

      soldermask_margin: 0.15,
    },
    // Pill with positive margin
    {
      type: "pcb_hole",
      pcb_hole_id: "hole_pill_positive",
      hole_shape: "pill",
      x: -2.5,
      y: 0,
      hole_width: 2.0,
      hole_height: 0.8,

      soldermask_margin: 0.1,
    },
    // Silkscreen labels for positive margin holes
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_circle_pos",
      layer: "top",
      anchor_position: { x: -4, y: 3.2 },
      anchor_alignment: "center",
      text: "+0.2mm",
      font_size: 0.4,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_square_pos",
      layer: "top",
      anchor_position: { x: -1, y: 3.2 },
      anchor_alignment: "center",
      text: "+0.15mm",
      font_size: 0.4,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_oval_pos",
      layer: "top",
      anchor_position: { x: 2, y: 3.2 },
      anchor_alignment: "center",
      text: "+0.1mm",
      font_size: 0.4,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_rect_pos",
      layer: "top",
      anchor_position: { x: 5, y: 3.2 },
      anchor_alignment: "center",
      text: "+0.15mm",
      font_size: 0.4,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_pill_pos",
      layer: "top",
      anchor_position: { x: -2.5, y: 1 },
      anchor_alignment: "center",
      text: "+0.1mm",
      font_size: 0.4,
    },
    // Labels for negative margin holes (bottom row)
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_circle_neg",
      layer: "top",
      anchor_position: { x: -4, y: -0.8 },
      anchor_alignment: "center",
      text: "-0.15mm",
      font_size: 0.4,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_square_neg",
      layer: "top",
      anchor_position: { x: -1, y: -0.8 },
      anchor_alignment: "center",
      text: "-0.1mm",
      font_size: 0.4,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_oval_neg",
      layer: "top",
      anchor_position: { x: 2, y: -0.8 },
      anchor_alignment: "center",
      text: "-0.12mm",
      font_size: 0.4,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_pill_neg",
      layer: "top",
      anchor_position: { x: -2.5, y: -2.8 },
      anchor_alignment: "center",
      text: "-0.08mm",
      font_size: 0.4,
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
