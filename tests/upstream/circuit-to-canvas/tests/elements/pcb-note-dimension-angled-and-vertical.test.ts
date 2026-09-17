import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbNoteDimension } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw pcb note dimension - angled", async () => {
  const width = 240
  const height = 160
  const dpr = 2
  const canvas = createCanvas(width * dpr, height * dpr)
  const ctx = canvas.getContext("2d")
  ctx.scale(dpr, dpr)
  const drawer = new CircuitToCanvasDrawer(ctx)

  // Background
  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, width, height)

  const angledDim: PcbNoteDimension = {
    type: "pcb_note_dimension",
    pcb_note_dimension_id: "note_dimension_angled_1",
    layer: "top",
    from: { x: 40, y: 120 },
    to: { x: 200, y: 40 }, // angled up-right
    arrow_size: 6,
    font_size: 8,
    text: "sqrt( (160)^2 + (80)^2 )",
    font: "tscircuit2024",
    // slight offset so extension lines are visible and text sits off the line
    offset_distance: 12,
  }

  drawer.drawElements([angledDim])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
