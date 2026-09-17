import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import { getBoundsOfPcbElements } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("drawPcbPanel with board and components", async () => {
  const elements: AnyCircuitElement[] = [
    // PANEL - represents the manufacturing panel boundary
    {
      type: "pcb_panel" as const,
      pcb_panel_id: "panel1",
      center: { x: 100, y: 75 },
      width: 180,
      height: 120,
      thickness: 1.6,
      covered_with_solder_mask: false,
    },
    // BOARD - smaller PCB board inside the panel
    {
      type: "pcb_board" as const,
      pcb_board_id: "board1",
      center: { x: 75, y: 60 },
      width: 80,
      height: 60,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4" as const,
    },
    {
      type: "pcb_smtpad" as const,
      pcb_smtpad_id: "pad1",
      shape: "rect" as const,
      x: 50,
      y: 45,
      width: 12,
      height: 6,
      layer: "top" as const,
    },
    {
      type: "pcb_smtpad" as const,
      pcb_smtpad_id: "pad2",
      shape: "rect" as const,
      x: 100,
      y: 45,
      width: 12,
      height: 6,
      layer: "top" as const,
    },
    {
      type: "pcb_trace" as const,
      pcb_trace_id: "trace1",
      route: [
        {
          route_type: "wire" as const,
          x: 50,
          y: 45,
          width: 2,
          layer: "top" as const,
        },
        {
          route_type: "wire" as const,
          x: 75,
          y: 45,
          width: 2,
          layer: "top" as const,
        },
        {
          route_type: "wire" as const,
          x: 75,
          y: 75,
          width: 2,
          layer: "top" as const,
        },
        {
          route_type: "wire" as const,
          x: 100,
          y: 75,
          width: 2,
          layer: "top" as const,
        },
      ],
    },
    {
      type: "pcb_via" as const,
      pcb_via_id: "via1",
      x: 75,
      y: 60,
      outer_diameter: 6,
      hole_diameter: 3,
      layers: ["top", "bottom"] as ("top" | "bottom")[],
    },
  ]

  // Panel is larger than the board (180x120 vs board 80x60)
  const canvas = createCanvas(800, 600)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#000000"
  ctx.fillRect(0, 0, 800, 600)

  const bounds = getBoundsOfPcbElements(elements)
  drawer.setCameraBounds({
    minX: bounds.minX,
    maxX: bounds.maxX,
    minY: bounds.minY,
    maxY: bounds.maxY,
  })

  drawer.drawElements(elements, {
    drawBoardMaterial: false,
    drawSoldermask: true,
    drawSoldermaskTop: true,
  })

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
