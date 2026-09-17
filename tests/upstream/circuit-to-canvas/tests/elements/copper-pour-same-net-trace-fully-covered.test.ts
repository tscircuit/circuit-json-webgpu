import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import circuitJson from "./assets/copper-pour-same-net-trace-fully-covered.json"

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

test("renders copper pour where same-net trace is fully covered", async () => {
  const elements = circuitJson as AnyCircuitElement[]
  const withTrace = render(elements)
  const withoutTrace = render(elements.filter((e) => e.type !== "pcb_trace"))

  expect(Buffer.compare(withTrace, withoutTrace)).toBe(0)
  await expect(withTrace).toMatchPngSnapshot(import.meta.path)
})
