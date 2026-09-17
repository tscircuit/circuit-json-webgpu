import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("pcb keepout multiple layers", async () => {
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
      num_layers: 4,
      thickness: 1.2,
    },
    {
      type: "pcb_keepout",
      shape: "rect",
      pcb_keepout_id: "pcb_keepout_multi_layer",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      layers: ["top", "bottom", "inner1"],
    },
    {
      type: "pcb_keepout",
      shape: "circle",
      pcb_keepout_id: "pcb_keepout_circle_multi",
      center: { x: 15, y: 15 },
      radius: 5,
      layers: ["top", "bottom"],
    },
  ]

  drawer.drawElements(elements)

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
