import {
  pcb_courtyard_circle,
  pcb_courtyard_outline,
  pcb_courtyard_pill,
  pcb_courtyard_polygon,
  pcb_courtyard_rect,
} from "circuit-json"

// Each row contains all five courtyard geometry types. Parsing also catches
// misspelled/unsupported fixture fields before an expected-failure assertion.
export function courtyardRow(layer: "top" | "bottom") {
  const y = layer === "top" ? 3 : -3
  const color = layer === "top" ? "#22cc88" : "#ffbb44"
  const common = { pcb_component_id: `component-${layer}`, layer }
  return [
    pcb_courtyard_rect.parse({
      ...common,
      type: "pcb_courtyard_rect",
      pcb_courtyard_rect_id: `rect-${layer}`,
      center: { x: -8, y },
      width: 3,
      height: 2,
      ccw_rotation: 30,
      color,
    }),
    pcb_courtyard_circle.parse({
      ...common,
      type: "pcb_courtyard_circle",
      pcb_courtyard_circle_id: `circle-${layer}`,
      center: { x: -4, y },
      radius: 1.2,
      color,
    }),
    pcb_courtyard_outline.parse({
      ...common,
      type: "pcb_courtyard_outline",
      pcb_courtyard_outline_id: `outline-${layer}`,
      outline: [
        { x: -1.5, y: y - 1 },
        { x: 1.5, y: y - 1 },
        { x: 1.5, y: y + 1 },
        { x: 0, y: y + 0.4 },
        { x: -1.5, y: y + 1 },
      ],
    }),
    pcb_courtyard_polygon.parse({
      ...common,
      type: "pcb_courtyard_polygon",
      pcb_courtyard_polygon_id: `polygon-${layer}`,
      points: [
        { x: 2.5, y: y - 1 },
        { x: 5.5, y: y - 1 },
        { x: 5.5, y: y + 1 },
        { x: 4, y: y + 0.4 },
        { x: 2.5, y: y + 1 },
      ],
      color,
    }),
    pcb_courtyard_pill.parse({
      ...common,
      type: "pcb_courtyard_pill",
      pcb_courtyard_pill_id: `pill-${layer}`,
      center: { x: 8, y },
      width: 3,
      height: 2,
      radius: 0.35,
      color,
    }),
  ] as const
}

export const courtyardElements = [
  ...courtyardRow("top"),
  ...courtyardRow("bottom"),
]
