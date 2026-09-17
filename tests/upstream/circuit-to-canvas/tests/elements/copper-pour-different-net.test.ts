import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import circuitJson from "./assets/copper-pour-different-net.json"

function render(elements: AnyCircuitElement[]): Buffer {
  const canvas = createCanvas(300, 200)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 300, 200)

  drawer.setCameraBounds({ minX: -10, maxX: 10, minY: -6, maxY: 6 })
  drawer.drawElements(elements)

  return canvas.toBuffer("image/png")
}

test("renders copper pour with different-net traces", async () => {
  const png = render(circuitJson as AnyCircuitElement[])
  await expect(png).toMatchPngSnapshot(import.meta.path)
})
