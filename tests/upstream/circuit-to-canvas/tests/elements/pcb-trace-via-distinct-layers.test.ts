import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("a top blind via does not suppress a bottom route via at the same position", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_via",
      pcb_via_id: "top_via",
      x: 50,
      y: 50,
      layers: ["top", "inner1"],
      outer_diameter: 20,
      hole_diameter: 10,
      tented_on_top: false,
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "bottom_trace",
      route: [
        { route_type: "wire", x: 10, y: 50, width: 2, layer: "bottom" },
        { route_type: "wire", x: 50, y: 50, width: 2, layer: "bottom" },
        {
          route_type: "via",
          x: 50,
          y: 50,
          from_layer: "bottom",
          to_layer: "inner2",
          outer_diameter: 20,
          hole_diameter: 10,
          tented_on_bottom: true,
        },
      ],
    },
  ]
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  drawer.drawElements(elements, {
    layers: ["bottom_copper"],
    drawSoldermask: true,
    drawSoldermaskBottom: true,
  })

  expect(Array.from(ctx.getImageData(50, 50, 1, 1).data)).toEqual([
    52, 135, 73, 255,
  ])
})
