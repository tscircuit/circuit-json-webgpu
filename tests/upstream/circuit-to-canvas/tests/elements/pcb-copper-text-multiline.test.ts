import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbCopperText } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw multiline copper text with center alignment", async () => {
  const SCALE = 4
  const canvas = createCanvas(150 * SCALE, 100 * SCALE)
  const ctx = canvas.getContext("2d")
  ctx.scale(SCALE, SCALE)
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, canvas.width / SCALE, canvas.height / SCALE)

  const text: PcbCopperText = {
    type: "pcb_copper_text",
    pcb_copper_text_id: "copper-text-1",
    pcb_component_id: "component1",
    layer: "top",
    text: "LINE1\nLONGERLINE2\nL3",
    anchor_position: { x: 75, y: 50 },
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 6,
  }

  drawer.drawElements([text])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
