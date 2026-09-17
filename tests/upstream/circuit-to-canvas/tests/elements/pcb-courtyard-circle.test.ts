import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbCourtyardCircle } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw courtyard circle", async () => {
  const canvas = createCanvas(1000, 1000)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 1000, 1000)

  const circle: PcbCourtyardCircle = {
    type: "pcb_courtyard_circle",
    pcb_courtyard_circle_id: "courtyard_circle1",
    pcb_component_id: "component1",
    layer: "top",
    center: { x: 0, y: 0 },
    radius: 2,
  }

  const circle2: PcbCourtyardCircle = {
    type: "pcb_courtyard_circle",
    pcb_courtyard_circle_id: "courtyard_circle2",
    pcb_component_id: "component2",
    layer: "bottom",
    center: { x: 3, y: 3 },
    radius: 1,
  }

  drawer.setCameraBounds({
    minX: -5,
    maxX: 5,
    minY: -5,
    maxY: 5,
  })

  drawer.drawElements([circle, circle2])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
