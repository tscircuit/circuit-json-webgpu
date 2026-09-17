import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbPlatedHole } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw hole with polygon pad - circle hole", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)

  const hole: PcbPlatedHole = {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "hole1",
    shape: "hole_with_polygon_pad",
    x: 50,
    y: 50,
    hole_shape: "circle",
    hole_diameter: 15,
    pad_outline: [
      { x: -20, y: -20 },
      { x: 20, y: -20 },
      { x: 25, y: 0 },
      { x: 20, y: 20 },
      { x: -20, y: 20 },
      { x: -25, y: 0 },
    ],
    layers: ["top", "bottom"],
  } as any

  drawer.drawElements([hole])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "hole-with-polygon-pad-circle",
  )
})

test("draw hole with polygon pad - pill hole with offset", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)

  const hole: PcbPlatedHole = {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "hole1",
    shape: "hole_with_polygon_pad",
    x: 50,
    y: 50,
    hole_shape: "pill",
    hole_width: 12,
    hole_height: 8,
    hole_offset_x: 5,
    hole_offset_y: -3,
    pad_outline: [
      { x: -25, y: -15 },
      { x: 25, y: -15 },
      { x: 30, y: 0 },
      { x: 25, y: 15 },
      { x: -25, y: 15 },
      { x: -30, y: 0 },
    ],
    layers: ["top", "bottom"],
  } as any

  drawer.drawElements([hole])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "hole-with-polygon-pad-pill-offset",
  )
})

test("draw hole with polygon pad - pill hole", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)

  const hole: PcbPlatedHole = {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "hole1",
    shape: "hole_with_polygon_pad",
    x: 50,
    y: 50,
    hole_shape: "rotated_pill",
    hole_width: 15,
    hole_height: 10,
    pad_outline: [
      { x: -20, y: -20 },
      { x: 20, y: -20 },
      { x: 20, y: 20 },
      { x: -20, y: 20 },
    ],
    layers: ["top", "bottom"],
  } as any

  drawer.drawElements([hole])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "hole-with-polygon-pad-pill",
  )
})
