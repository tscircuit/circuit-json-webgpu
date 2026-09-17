import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { NinePointAnchor, PcbCopperText } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

const ALIGNMENT_LABELS: Array<{
  alignment: NinePointAnchor
  text: string
  x: number
  y: number
}> = [
  { alignment: "top_left", text: "TL", x: 100, y: 50 },
  { alignment: "top_center", text: "TC", x: 200, y: 50 },
  { alignment: "top_right", text: "TR", x: 300, y: 50 },
  { alignment: "center_left", text: "CL", x: 100, y: 150 },
  { alignment: "center", text: "C", x: 200, y: 150 },
  { alignment: "center_right", text: "CR", x: 300, y: 150 },
  { alignment: "bottom_left", text: "BL", x: 100, y: 250 },
  { alignment: "bottom_center", text: "BC", x: 200, y: 250 },
  { alignment: "bottom_right", text: "BR", x: 300, y: 250 },
]

test("draw copper knockout text with different anchor alignments", async () => {
  const SCALE = 4
  const canvas = createCanvas(400 * SCALE, 300 * SCALE)
  const ctx = canvas.getContext("2d")
  ctx.scale(SCALE, SCALE)
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, canvas.width / SCALE, canvas.height / SCALE)

  ctx.strokeStyle = "#444444"
  ctx.lineWidth = 0.5
  for (const y of [50, 150, 250]) {
    ctx.beginPath()
    ctx.moveTo(10, y)
    ctx.lineTo(390, y)
    ctx.stroke()
  }
  for (const x of [100, 200, 300]) {
    ctx.beginPath()
    ctx.moveTo(x, 10)
    ctx.lineTo(x, 290)
    ctx.stroke()
  }

  ctx.strokeStyle = "#5ed6ff"
  ctx.lineWidth = 1
  for (const { x, y } of ALIGNMENT_LABELS) {
    ctx.beginPath()
    ctx.moveTo(x - 6, y)
    ctx.lineTo(x + 6, y)
    ctx.moveTo(x, y - 6)
    ctx.lineTo(x, y + 6)
    ctx.stroke()
  }

  const text: PcbCopperText[] = ALIGNMENT_LABELS.map(
    ({ alignment, text, x, y }) => ({
      type: "pcb_copper_text",
      pcb_copper_text_id: `copper-text-${alignment}`,
      pcb_component_id: "component1",
      layer: "top",
      text,
      anchor_position: { x, y },
      anchor_alignment: alignment,
      font: "tscircuit2024",
      font_size: 12,
      is_knockout: true,
    }),
  )

  drawer.drawElements(text)

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
