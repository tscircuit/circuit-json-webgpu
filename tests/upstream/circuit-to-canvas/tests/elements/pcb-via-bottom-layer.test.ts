import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbVia } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw via on bottom layer uses bottom copper color", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)

  const via: PcbVia = {
    type: "pcb_via",
    pcb_via_id: "via1",
    x: 50,
    y: 50,
    outer_diameter: 40,
    hole_diameter: 20,
    layers: ["top", "bottom"],
  }

  drawer.drawElements([via], { layers: ["bottom_copper"] })

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
