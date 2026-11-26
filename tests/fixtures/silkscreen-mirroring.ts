import { pcb_silkscreen_text } from "circuit-json"

export const mirroredSilkscreenText = pcb_silkscreen_text.parse({
  type: "pcb_silkscreen_text",
  pcb_silkscreen_text_id: "mirrored-silkscreen",
  pcb_component_id: "component",
  text: "F2",
  font_size: 3,
  anchor_position: { x: 0, y: 0 },
  anchor_alignment: "center",
  layer: "top",
  is_mirrored: true,
})
