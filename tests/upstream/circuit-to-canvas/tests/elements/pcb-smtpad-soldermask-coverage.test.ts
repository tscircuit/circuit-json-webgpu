import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw smt pads fully covered with soldermask and board with soldermask", async () => {
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
    // Rectangle pad fully covered with soldermask (no margin)
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rect_covered",
      shape: "rect",
      layer: "top",
      x: -4,
      y: 2,
      width: 1.6,
      height: 1.1,
      is_covered_with_solder_mask: true,
    },
    // Circle pad fully covered with soldermask (no margin)
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_circle_covered",
      shape: "circle",
      layer: "top",
      x: 0,
      y: 2,
      radius: 0.75,
      is_covered_with_solder_mask: true,
    },
    // Pill fully covered with soldermask (no margin)
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_pill_covered",
      shape: "pill",
      layer: "top",
      x: 4,
      y: 2,
      width: 2.4,
      height: 1,
      is_covered_with_solder_mask: true,
    },
    // Rotated rectangle pad fully covered with soldermask
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rotated_rect_covered",
      shape: "rotated_rect",
      layer: "top",
      x: -4,
      y: -2,
      width: 1.6,
      height: 1.1,
      ccw_rotation: 45,
      is_covered_with_solder_mask: true,
    },
    // Rotated pill pad fully covered with soldermask
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rotated_pill_covered",
      shape: "rotated_pill",
      layer: "top",
      x: 0,
      y: -2,
      width: 2.4,
      height: 1,
      ccw_rotation: 30,
      is_covered_with_solder_mask: true,
    },
    // Polygon pad fully covered with soldermask
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_polygon_covered",
      shape: "polygon",
      layer: "top",
      x: 4,
      y: -2,
      points: [
        { x: 3.5, y: -2.5 },
        { x: 4.5, y: -2.5 },
        { x: 4.5, y: -1.5 },
        { x: 4, y: -1 },
        { x: 3.5, y: -1.5 },
      ],
      is_covered_with_solder_mask: true,
    },
    // Silkscreen labels
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_rect",
      layer: "top",
      anchor_position: { x: -4, y: 3.2 },
      anchor_alignment: "center",
      text: "Rect",
      font_size: 0.4,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_circle",
      layer: "top",
      anchor_position: { x: 0, y: 3.2 },
      anchor_alignment: "center",
      text: "Circle",
      font_size: 0.4,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_pill",
      layer: "top",
      anchor_position: { x: 4, y: 3.2 },
      anchor_alignment: "center",
      text: "Pill",
      font_size: 0.4,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_rotated_rect",
      layer: "top",
      anchor_position: { x: -4, y: -3.2 },
      anchor_alignment: "center",
      text: "Rotated Rect",
      font_size: 0.4,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_rotated_pill",
      layer: "top",
      anchor_position: { x: 0, y: -3.2 },
      anchor_alignment: "center",
      text: "Rot Pill",
      font_size: 0.4,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_polygon",
      layer: "top",
      anchor_position: { x: 4, y: -3.2 },
      anchor_alignment: "center",
      text: "Polygon",
      font_size: 0.4,
    },
  ]

  drawer.setCameraBounds({ minX: -7, maxX: 7, minY: -5, maxY: 5 })
  drawer.drawElements(circuit, { drawSoldermask: true })

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
