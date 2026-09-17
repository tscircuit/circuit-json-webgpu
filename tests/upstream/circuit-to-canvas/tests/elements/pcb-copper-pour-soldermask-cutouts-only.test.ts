import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { identity } from "transformation-matrix"
import { drawPcbSoldermask } from "../../lib/drawer/elements/pcb-soldermask"
import { DEFAULT_PCB_COLOR_MAP } from "../../lib/drawer/types"

test("soldermask over covered copper pour cuts openings without rendering other components", async () => {
  const canvas = createCanvas(220, 160)
  const ctx = canvas.getContext("2d")

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 220, 160)

  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_sm_cutout_only",
      center: { x: 110, y: 80 },
      width: 180,
      height: 120,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "covered_pour_sm_cutout_only",
      shape: "rect",
      layer: "top",
      center: { x: 110, y: 80 },
      width: 140,
      height: 90,
      covered_with_solder_mask: true,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "open_pad_sm_cutout_only",
      shape: "rotated_rect",
      layer: "top",
      x: 84,
      y: 80,
      width: 28,
      height: 18,
      ccw_rotation: 20,
      corner_radius: 2,
      soldermask_margin: 0,
      is_covered_with_solder_mask: false,
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "open_pth_sm_cutout_only",
      shape: "pill",
      x: 134,
      y: 80,
      outer_width: 30,
      outer_height: 16,
      hole_width: 16,
      hole_height: 6,
      ccw_rotation: 15,
      layers: ["top", "bottom"],
      soldermask_margin: 0,
      is_covered_with_solder_mask: false,
    },
  ]

  drawPcbSoldermask({
    ctx,
    elements,
    realToCanvasMat: identity(),
    colorMap: DEFAULT_PCB_COLOR_MAP,
    layer: "top",
    drawSoldermask: true,
  })

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "copper-pour-soldermask-cutouts-no-component-render",
  )
})
