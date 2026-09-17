import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbSilkscreenText } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw multiline silkscreen text", async () => {
  const SCALE = 4
  const canvas = createCanvas(150 * SCALE, 100 * SCALE)
  const ctx = canvas.getContext("2d")
  ctx.scale(SCALE, SCALE)
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, canvas.width / SCALE, canvas.height / SCALE)

  const text1: PcbSilkscreenText = {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "silkscreen-text-1",
    pcb_component_id: "component1",
    layer: "top",
    text: "Top\\nLeft",
    anchor_position: { x: 40, y: 50 },
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 4,
  }

  const text2: PcbSilkscreenText = {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "silkscreen-text-2",
    pcb_component_id: "component1",
    layer: "top",
    text: "Top\nLeft",
    anchor_position: { x: 110, y: 50 },
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 4,
  }

  drawer.drawElements([text1, text2])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
