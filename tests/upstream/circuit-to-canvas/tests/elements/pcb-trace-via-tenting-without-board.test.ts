import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbTrace } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("route via tenting works without a board and only with soldermask enabled", () => {
  const trace: PcbTrace = {
    type: "pcb_trace",
    pcb_trace_id: "trace",
    route: [
      { route_type: "wire", x: 10, y: 50, width: 4, layer: "top" },
      { route_type: "wire", x: 50, y: 50, width: 4, layer: "top" },
      {
        route_type: "via",
        x: 50,
        y: 50,
        from_layer: "top",
        to_layer: "bottom",
        hole_diameter: 10,
        outer_diameter: 20,
        tented_on_top: true,
        tented_on_bottom: false,
      },
    ],
  }
  const canvas = createCanvas(150, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)
  const pixel = (x: number) => Array.from(ctx.getImageData(x, 50, 1, 1).data)
  drawer.drawElements([trace], {
    layers: ["top_copper"],
    drawSoldermask: true,
  })
  expect(pixel(50)).toEqual([52, 135, 73, 255])

  ctx.clearRect(0, 0, 150, 100)
  drawer.drawElements([trace], {
    layers: ["bottom_copper"],
    drawSoldermask: true,
    drawSoldermaskTop: false,
    drawSoldermaskBottom: true,
  })
  expect(pixel(50)).toEqual([255, 38, 226, 255])

  ctx.clearRect(0, 0, 150, 100)
  drawer.drawElements([trace], {
    layers: ["top_copper"],
    drawSoldermask: false,
  })
  expect(pixel(50)).toEqual([255, 38, 226, 255])
})
