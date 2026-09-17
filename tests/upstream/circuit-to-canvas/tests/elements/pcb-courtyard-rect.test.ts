import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbCourtyardRect } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw courtyard rect", async () => {
  const canvas = createCanvas(1000, 1000)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 1000, 1000)

  const rect1: PcbCourtyardRect = {
    type: "pcb_courtyard_rect",
    pcb_courtyard_rect_id: "courtyard_rect1",
    pcb_component_id: "component1",
    layer: "top",
    center: { x: 0, y: 0 },
    width: 4,
    height: 2,
  }

  const rect2: PcbCourtyardRect = {
    type: "pcb_courtyard_rect",
    pcb_courtyard_rect_id: "courtyard_rect2",
    pcb_component_id: "component2",
    layer: "bottom",
    center: { x: 3, y: 3 },
    width: 2,
    height: 4,
  }

  drawer.setCameraBounds({
    minX: -5,
    maxX: 5,
    minY: -5,
    maxY: 5,
  })

  drawer.drawElements([rect1, rect2])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
