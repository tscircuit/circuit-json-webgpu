import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbCopperText } from "circuit-json"
import { scale } from "transformation-matrix"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw copper text", async () => {
  const SCALE = 4
  const canvas = createCanvas(100 * SCALE, 100 * SCALE)
  const ctx = canvas.getContext("2d")
  ctx.scale(SCALE, SCALE)
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, canvas.width / SCALE, canvas.height / SCALE)

  const text: PcbCopperText[] = [
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "copper-text-1",
      pcb_component_id: "component1",
      layer: "top",
      text: "AabcbCdde",
      anchor_position: { x: 40, y: 40 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 8,
    },

    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "copper-text-2",
      pcb_component_id: "component1",
      layer: "bottom",
      text: "T2",
      anchor_position: { x: 60, y: 60 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 6,
      is_mirrored: true,
    },
  ]

  drawer.drawElements(text)

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "pcb-copper-text",
  )
})

test("draw bottom copper text auto-mirrored when is_mirrored is omitted", async () => {
  const SCALE = 4
  const canvas = createCanvas(100 * SCALE, 100 * SCALE)
  const ctx = canvas.getContext("2d")
  ctx.scale(SCALE, SCALE)
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, canvas.width / SCALE, canvas.height / SCALE)

  const text: PcbCopperText[] = [
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "copper-text-auto-mirror-top",
      pcb_component_id: "component1",
      layer: "top",
      text: "F3",
      anchor_position: { x: 30, y: 50 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 8,
    },
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "copper-text-auto-mirror-bottom",
      pcb_component_id: "component1",
      layer: "bottom",
      text: "F3",
      anchor_position: { x: 70, y: 50 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 8,
    },
  ]

  drawer.drawElements(text)

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "pcb-copper-text-bottom-auto-mirror",
  )
})

test("draw copper text knockout mirrored with padding", async () => {
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

  const text: PcbCopperText[] = [
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "copper-text-2",
      pcb_component_id: "component1",
      layer: "bottom",
      text: "KO1",
      anchor_position: { x: 25, y: 15 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 10,
      is_knockout: true,
      is_mirrored: true,
    },

    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "copper-text-3",
      pcb_component_id: "component1",
      layer: "top",
      text: "KO2",
      anchor_position: { x: 40, y: 20 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 8,
      is_knockout: true,
      is_mirrored: false,
      ccw_rotation: 45,
    },
  ]

  drawer.drawElements(text)

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "pcb-copper-text-knockout",
  )
})
