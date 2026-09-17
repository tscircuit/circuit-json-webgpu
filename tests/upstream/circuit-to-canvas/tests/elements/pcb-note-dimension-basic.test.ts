import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbNoteDimension } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw pcb note dimension - basic", async () => {
  const width = 200
  const height = 100
  const dpr = 2
  const canvas = createCanvas(width * dpr, height * dpr)
  const ctx = canvas.getContext("2d")
  ctx.scale(dpr, dpr)
  const drawer = new CircuitToCanvasDrawer(ctx)

  // Background
  ctx.fillStyle = "#1a1a1a"
  // Use logical dimensions when filling background (canvas is scaled)
  ctx.fillRect(0, 0, width, height)

  const dim: PcbNoteDimension = {
    type: "pcb_note_dimension",
    pcb_note_dimension_id: "note_dimension_basic_1",
    layer: "top",
    from: { x: 20, y: 50 },
    to: { x: 180, y: 50 },
    arrow_size: 4,
    font_size: 6,
    font: "tscircuit2024",
    text: "160",
  }

  drawer.drawElements([dim])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
