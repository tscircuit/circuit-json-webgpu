import type { CircuitJson } from "../../lib"

export const rotatedPadDrillOffsets = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 36,
    height: 18,
    thickness: 1.6,
    num_layers: 4,
    material: "fr4",
  },
  ...[0, 90, 180, 270].flatMap((rect_ccw_rotation, column) => {
    const x = column * 8 - 12
    return [
      {
        type: "pcb_plated_hole" as const,
        pcb_plated_hole_id: `pad-${rect_ccw_rotation}`,
        shape: "circular_hole_with_rect_pad" as const,
        x,
        y: 0,
        rect_pad_width: 6,
        rect_pad_height: 4,
        rect_ccw_rotation,
        hole_shape: "circle" as const,
        pad_shape: "rect" as const,
        hole_diameter: 1,
        hole_offset_x: 1,
        hole_offset_y: -1,
        layers: ["top" as const, "inner1" as const, "bottom" as const],
      },
      {
        type: "pcb_note_text" as const,
        pcb_note_text_id: `label-${rect_ccw_rotation}`,
        pcb_component_id: "component",
        text: `PAD ${rect_ccw_rotation}deg`,
        anchor_position: { x, y: 5 },
        anchor_alignment: "center" as const,
        font_size: 0.7,
        font: "tscircuit2024" as const,
        layer: "top" as const,
      },
    ]
  }),
  {
    type: "pcb_note_text",
    pcb_note_text_id: "expected",
    pcb_component_id: "component",
    text: "DRILLS STAY 1mm RIGHT AND 1mm BELOW EACH PAD CENTER",
    anchor_position: { x: 0, y: -6 },
    anchor_alignment: "center",
    font_size: 0.6,
    font: "tscircuit2024",
    layer: "top",
  },
] satisfies CircuitJson
