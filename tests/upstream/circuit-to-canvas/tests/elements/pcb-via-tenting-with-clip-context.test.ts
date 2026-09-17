import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("repeated board context preserves the rendered board's tenting defaults", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 50, y: 50 },
      width: 100,
      height: 100,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
      default_via_tented_on_top: true,
    },
    {
      type: "pcb_via",
      pcb_via_id: "via",
      x: 50,
      y: 50,
      layers: ["top", "bottom"],
      outer_diameter: 20,
      hole_diameter: 10,
    },
  ]
  const context = structuredClone(elements)
  const board = context.find((element) => element.type === "pcb_board")!
  board.default_via_tented_on_top = false
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  drawer.drawElements(elements, {
    layers: ["top_copper"],
    drawSoldermask: true,
    clipContextElements: context,
  })

  expect(Array.from(ctx.getImageData(50, 50, 1, 1).data)).toEqual([
    52, 135, 73, 255,
  ])

  ctx.clearRect(0, 0, 100, 100)
  drawer.drawElements(
    elements.filter((element) => element.type === "pcb_via"),
    {
      layers: ["top_copper"],
      drawSoldermask: true,
    },
  )
  expect(Array.from(ctx.getImageData(50, 50, 1, 1).data)).toEqual([
    255, 38, 226, 255,
  ])
})
