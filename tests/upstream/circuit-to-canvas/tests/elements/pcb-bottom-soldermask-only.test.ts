import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("render bottom soldermask layer with openings", async () => {
  const canvas = createCanvas(900, 500)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 900, 500)

  const circuit: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_bottom_mask_openings",
      center: { x: 0, y: 0 },
      width: 18,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "bottom_pad_positive",
      shape: "rect",
      layer: "bottom",
      x: -4,
      y: 2,
      width: 2,
      height: 1.2,
      is_covered_with_solder_mask: true,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "bottom_pad_negative",
      shape: "pill",
      layer: "bottom",
      x: 0,
      y: 2,
      width: 2.8,
      height: 1,
      radius: 0.5,
      soldermask_margin: -0.15,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "bottom_pad_covered",
      shape: "circle",
      layer: "bottom",
      x: 4,
      y: 2,
      radius: 0.8,
      is_covered_with_solder_mask: true,
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "pth_both_layers",
      shape: "circle",
      x: 0,
      y: -2,
      outer_diameter: 2,
      hole_diameter: 1,
      layers: ["top", "bottom"],
      soldermask_margin: 0.15,
    },
    {
      type: "pcb_hole",
      pcb_hole_id: "np_bottom",
      hole_shape: "circle",
      x: -4,
      y: -2,
      hole_diameter: 1.2,
      soldermask_margin: -0.1,
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "bottom_trace",
      route: [
        { x: -6, y: -3, route_type: "wire", width: 0.5, layer: "bottom" },
        { x: 6, y: -3, route_type: "wire", width: 0.5, layer: "bottom" },
      ],
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "top_pad_ignored",
      shape: "rect",
      layer: "top",
      x: 4,
      y: -2,
      width: 2,
      height: 1.2,
      soldermask_margin: 0.2,
    },
  ]

  drawer.setCameraBounds({ minX: -9, maxX: 9, minY: -5, maxY: 5 })
  drawer.drawElements(circuit, {
    drawSoldermask: true,
    drawSoldermaskTop: false,
    drawSoldermaskBottom: true,
    drawBoardMaterial: true,
  })

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
