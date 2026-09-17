import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbSilkscreenText } from "circuit-json"
import { scale } from "transformation-matrix"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw silkscreen text knockout", async () => {
  const SCALE = 4
  const canvas = createCanvas(100 * SCALE, 60 * SCALE)
  const ctx = canvas.getContext("2d")
  ctx.scale(SCALE, SCALE)
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, canvas.width / SCALE, canvas.height / SCALE)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"
  ctx.lineWidth = 1
  for (let y = 22; y <= 58; y += 3) {
    ctx.beginPath()
    ctx.moveTo(8, y)
    ctx.lineTo(92, y)
    ctx.stroke()
  }
  for (let x = 48; x <= 92; x += 4) {
    ctx.beginPath()
    ctx.moveTo(x, 60)
    ctx.lineTo(x + 28, 20)
    ctx.stroke()
  }

  drawer.realToCanvasMat = scale(2, 2)

  const text: PcbSilkscreenText[] = [
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text1",
      pcb_component_id: "component1",
      layer: "top",
      text: "U1",
      anchor_position: { x: 25, y: 15 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 8,
      is_knockout: true,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text2",
      pcb_component_id: "component1",
      layer: "bottom",
      text: "R1",
      anchor_position: { x: 25, y: 25 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 6,
      is_knockout: true,
      knockout_padding: { left: 0.5, right: 0.5, top: 0.3, bottom: 0.3 },
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text3",
      pcb_component_id: "component1",
      layer: "top",
      text: "C1",
      anchor_position: { x: 40, y: 20 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 8,
      is_knockout: true,
      ccw_rotation: 45,
    },
  ]

  drawer.drawElements(text)

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
