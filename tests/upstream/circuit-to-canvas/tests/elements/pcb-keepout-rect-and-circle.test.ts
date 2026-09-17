import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("pcb keepout rect and circle", async () => {
  const canvas = createCanvas(2000, 1600)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  drawer.setCameraBounds({ minX: -25, maxX: 25, minY: -20, maxY: 20 })

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 50,
      height: 40,
      material: "fr1",
      num_layers: 2,
      thickness: 1.2,
    },
    {
      type: "pcb_keepout",
      shape: "rect",
      pcb_keepout_id: "pcb_keepout_rect_0",
      center: { x: -10, y: 10 },
      width: 8,
      height: 5,
      layers: ["top"],
    },
    {
      type: "pcb_keepout",
      shape: "circle",
      pcb_keepout_id: "pcb_keepout_circle_0",
      center: { x: 0, y: 0 },
      radius: 4,
      layers: ["top"],
    },
    {
      type: "pcb_keepout",
      shape: "rect",
      pcb_keepout_id: "pcb_keepout_rect_1",
      center: { x: 10, y: -10 },
      width: 6,
      height: 6,
      layers: ["bottom"],
    },
  ]

  drawer.drawElements(elements)

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
