import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbRenderLayer, PcbVia } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

const renderViaLayer = (via: PcbVia | undefined, layer: PcbRenderLayer) => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)
  drawer.drawElements(via ? [via] : [], { layers: [layer] })

  return canvas.toBuffer("image/png")
}

test("draw buried via only on layers in its span", async () => {
  const via: PcbVia = {
    type: "pcb_via",
    pcb_via_id: "via_inner8",
    x: 50,
    y: 50,
    outer_diameter: 40,
    hole_diameter: 20,
    layers: ["inner7", "inner8"],
  }

  const inner8 = renderViaLayer(via, "inner8_copper")
  const inner6 = renderViaLayer(via, "inner6_copper")
  const blank = renderViaLayer(undefined, "inner6_copper")

  expect(Buffer.compare(inner8, blank)).not.toBe(0)
  expect(Buffer.compare(inner6, blank)).toBe(0)
  await expect(inner8).toMatchPngSnapshot(import.meta.path)
})
