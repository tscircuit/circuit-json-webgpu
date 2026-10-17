import type { CircuitJson, PcbVia } from "circuit-json"

const COLUMN_COUNT = 30
const ROW_COUNT = 18
const VIA_SPACING_MM = 1.2

const vias: PcbVia[] = Array.from(
  { length: COLUMN_COUNT * ROW_COUNT },
  (_, index) => {
    const column = index % COLUMN_COUNT
    const row = Math.floor(index / COLUMN_COUNT)
    const isBuriedVia = column >= 20
    const layers = isBuriedVia
      ? (["inner1", "inner2"] as const)
      : (["top", "inner1", "inner2", "bottom"] as const)

    return {
      type: "pcb_via",
      pcb_via_id: `dense_via_${index}`,
      x: (column - (COLUMN_COUNT - 1) / 2) * VIA_SPACING_MM,
      y: (row - (ROW_COUNT - 1) / 2) * VIA_SPACING_MM,
      hole_diameter: 0.4,
      outer_diameter: 0.8,
      layers: [...layers],
      from_layer: layers[0],
      to_layer: layers.at(-1)!,
      is_covered_with_solder_mask: !isBuriedVia && column >= 10,
    }
  },
)

export const denseViaFixture: CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "dense_via_board",
    center: { x: 0, y: 0 },
    width: 38,
    height: 23,
    thickness: 1.6,
    num_layers: 4,
    material: "fr4",
  },
  ...vias,
]
