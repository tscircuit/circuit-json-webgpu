import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbNoteText } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw bottom pcb note text auto-mirrored when is_mirrored is omitted", async () => {
  const SCALE = 4
  const canvas = createCanvas(100 * SCALE, 100 * SCALE)
  const ctx = canvas.getContext("2d")
  ctx.scale(SCALE, SCALE)
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, canvas.width / SCALE, canvas.height / SCALE)

  const text: PcbNoteText[] = [
    {
      type: "pcb_note_text",
      pcb_note_text_id: "note-text-auto-mirror-top",
      layer: "top",
      text: "F3",
      anchor_position: { x: 30, y: 50 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 8,
    },
    {
      type: "pcb_note_text",
      pcb_note_text_id: "note-text-auto-mirror-bottom",
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
    "pcb-note-text-bottom-auto-mirror",
  )
})
