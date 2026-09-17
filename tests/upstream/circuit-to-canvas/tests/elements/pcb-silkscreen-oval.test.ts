import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbSilkscreenOval } from "circuit-json"
import { getStackedPngSvgComparison } from "../fixtures/getStackedPngSvgComparison"

test("draw silkscreen oval", async () => {
  const oval: PcbSilkscreenOval = {
    type: "pcb_silkscreen_oval",
    layer: "top" as const,
    pcb_component_id: "pcb_component_1",
    pcb_silkscreen_oval_id: "oval_1",
    center: { x: 0, y: 0 },
    radius_x: 2,
    radius_y: 1,
    ccw_rotation: 45,
  }

  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    oval,
  ]

  const stackedPng = await getStackedPngSvgComparison(circuitJson, {
    width: 400,
    height: 800,
  })

  await expect(stackedPng).toMatchPngSnapshot(import.meta.path)
})
