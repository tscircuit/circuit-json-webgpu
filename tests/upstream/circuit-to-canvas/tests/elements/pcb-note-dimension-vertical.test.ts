import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbNoteDimension } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw pcb note dimension - vertical with rotation", async () => {
  const width = 160
  const height = 240
  const dpr = 2
  const canvas = createCanvas(width * dpr, height * dpr)
  const ctx = canvas.getContext("2d")
  ctx.scale(dpr, dpr)
  const drawer = new CircuitToCanvasDrawer(ctx)

  // Background
  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, width, height)

  const verticalDim: PcbNoteDimension = {
    type: "pcb_note_dimension",
    pcb_note_dimension_id: "note_dimension_vertical_1",
    layer: "top",
    from: { x: 80, y: 40 },
    to: { x: 80, y: 200 }, // vertical line downwards
    arrow_size: 6,
    font_size: 9,
    text: "160",
    font: "tscircuit2024",
    // Provide explicit text rotation (counter-clockwise degrees),
    // which should align text along the vertical dimension.
    text_ccw_rotation: 90,
    // Offset horizontally so the dimension line sits right of the points,
    // and extension lines from the points are drawn to the dimension line.
    offset_distance: 14,
    offset_direction: { x: 1, y: 0 },
  }

  drawer.drawElements([verticalDim])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
