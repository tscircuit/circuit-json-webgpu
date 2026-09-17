import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbCourtyardOutline } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw courtyard outline", async () => {
  const canvas = createCanvas(1000, 1000)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 1000, 1000)

  const outline1: PcbCourtyardOutline = {
    type: "pcb_courtyard_outline",
    pcb_courtyard_outline_id: "courtyard_outline1",
    pcb_component_id: "component1",
    layer: "top",
    outline: [
      { x: 5, y: 0 },
      { x: 8, y: 0 },
      { x: 8, y: 1 },
      { x: 6, y: 1 },
      { x: 6, y: 3 },
      { x: 5, y: 3 },
    ],
  }
  const outline2: PcbCourtyardOutline = {
    type: "pcb_courtyard_outline",
    pcb_courtyard_outline_id: "courtyard_outline2",
    pcb_component_id: "component2",
    layer: "bottom",
    outline: [
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 1.5, y: 2.5 },
    ],
  }

  drawer.setCameraBounds({
    minX: -2,
    maxX: 10, // Increased to include outline1 (x=8)
    minY: -2,
    maxY: 5,
  })

  drawer.drawElements([outline1, outline2])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
