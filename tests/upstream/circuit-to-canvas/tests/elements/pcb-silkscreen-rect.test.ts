import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbSilkscreenRect } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw silkscreen rect", async () => {
  const canvas = createCanvas(200, 200)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 200, 200)

  const rect: PcbSilkscreenRect = {
    type: "pcb_silkscreen_rect",
    pcb_silkscreen_rect_id: "rect1",
    pcb_component_id: "component1",
    layer: "top",
    center: { x: 100, y: 100 },
    width: 80,
    height: 40,
    stroke_width: 0.4,
    corner_radius: 10,
  }

  drawer.drawElements([rect])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
