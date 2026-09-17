import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbNoteDimension } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw pcb note dimension - with offset", async () => {
  const width = 200
  const height = 120
  const dpr = 2
  const canvas = createCanvas(width * dpr, height * dpr)
  const ctx = canvas.getContext("2d")
  ctx.scale(dpr, dpr)
  const drawer = new CircuitToCanvasDrawer(ctx)

  // Background
  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, width, height)

  const dimWithOffset: PcbNoteDimension = {
    type: "pcb_note_dimension",
    pcb_note_dimension_id: "note_dimension_offset_1",
    layer: "top",
    from: { x: 40, y: 70 },
    to: { x: 160, y: 70 },
    arrow_size: 5,
    font_size: 7,
    text: "120",
    font: "tscircuit2024",
    // Offset the dimension line along a custom direction, ensuring extension lines are drawn
    offset_distance: 10,
    offset_direction: { x: 0, y: -1 }, // offset upward by 10 units
  }

  drawer.drawElements([dimWithOffset])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
