import { expect, test } from "bun:test"
import type {
  AnyCircuitElement,
  PcbFabricationNoteDimension,
} from "circuit-json"
import { getStackedPngSvgComparison } from "../fixtures/getStackedPngSvgComparison"

test("draw pcb fabrication note dimension - basic", async () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 10, y: 5 },
      width: 25,
      height: 15,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_fabrication_note_dimension",
      pcb_fabrication_note_dimension_id: "fab_dim_1",
      from: { x: 2, y: 5 },
      to: { x: 18, y: 5 },
      arrow_size: 0.4,
      font_size: 0.6,
      text: "16mm",
      layer: "top",
      pcb_component_id: "comp_1",
      font: "tscircuit2024",
    },
  ]

  const stackedPng = await getStackedPngSvgComparison(circuitJson, {
    width: 400,
    height: 800,
  })

  await expect(stackedPng).toMatchPngSnapshot(import.meta.path)
})
