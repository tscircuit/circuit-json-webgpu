import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbNoteRect } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

const noteRect: PcbNoteRect = {
  type: "pcb_note_rect",
  pcb_note_rect_id: "note_rect1",
  layer: "top",
  pcb_component_id: "component1",
  pcb_group_id: "group1",
  subcircuit_id: "subcircuit1",
  name: "Test Note",
  text: "Toggle test",
  center: { x: 0, y: 0 },
  width: 4,
  height: 2,
  stroke_width: 0.1,
  is_filled: true,
  has_stroke: true,
  color: "#00FFFF",
}

test("pcb_note elements are rendered by default (showPcbNotes defaults to true)", async () => {
  const canvas = createCanvas(200, 200)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 200, 200)

  drawer.setCameraBounds({ minX: -5, maxX: 5, minY: -5, maxY: 5 })
  drawer.drawElements([noteRect])

  const shownBuffer = canvas.toBuffer("image/png")

  // Draw a blank canvas for comparison
  const blankCanvas = createCanvas(200, 200)
  const blankCtx = blankCanvas.getContext("2d")
  blankCtx.fillStyle = "#1a1a1a"
  blankCtx.fillRect(0, 0, 200, 200)
  const blankBuffer = blankCanvas.toBuffer("image/png")

  // Should NOT be identical — the note rect should be visible by default
  expect(shownBuffer).not.toEqual(blankBuffer)
})

test("pcb_note elements are hidden when showPcbNotes is false", async () => {
  const canvas = createCanvas(200, 200)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 200, 200)

  drawer.setCameraBounds({ minX: -5, maxX: 5, minY: -5, maxY: 5 })
  drawer.drawElements([noteRect], { showPcbNotes: false })

  const hiddenBuffer = canvas.toBuffer("image/png")

  // Draw a blank canvas for comparison
  const blankCanvas = createCanvas(200, 200)
  const blankCtx = blankCanvas.getContext("2d")
  blankCtx.fillStyle = "#1a1a1a"
  blankCtx.fillRect(0, 0, 200, 200)
  const blankBuffer = blankCanvas.toBuffer("image/png")

  // Both should be identical since pcb_note is hidden
  expect(hiddenBuffer).toEqual(blankBuffer)
})
