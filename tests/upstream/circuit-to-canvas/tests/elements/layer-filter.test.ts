import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbSmtPad } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("layer filter only draws elements on specified layers", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)

  const topPad: PcbSmtPad = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad1",
    shape: "rect",
    x: 30,
    y: 50,
    width: 20,
    height: 20,
    layer: "top",
  }

  const bottomPad: PcbSmtPad = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad2",
    shape: "rect",
    x: 70,
    y: 50,
    width: 20,
    height: 20,
    layer: "bottom",
  }

  // Draw only top layer - should only show top pad (left side)
  drawer.drawElements([topPad, bottomPad], { layers: ["top_copper"] })

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
