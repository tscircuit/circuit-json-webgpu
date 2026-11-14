import type { CircuitJson } from "../../lib"

// Published Classic F1 v6.0.7: the top GND run from LCD connector J6's tab.
// Keep pcb_trace_external_163's endpoints, width, and flags. The rectangle is
// a crop entirely within the original pcb_copper_pour_38 polygon.
const traceId = "pcb_trace_external_163"
const pourId = "pcb_copper_pour_38"
const groundWire = {
  route_type: "wire",
  x: -19.475,
  width: 0.15,
  layer: "top",
  is_inside_copper_pour: true,
  copper_pour_id: pourId,
} as const

export const classicF1J6Ground = {
  traceId,
  elements: [
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: pourId,
      source_net_id: "source_net_12",
      layer: "top",
      shape: "rect",
      center: { x: -19.475, y: -14.4 },
      width: 0.17,
      height: 15.6,
      covered_with_solder_mask: true,
    },
    {
      type: "pcb_trace",
      pcb_trace_id: traceId,
      source_trace_id: "source_trace_24",
      route: [
        { ...groundWire, y: -6.8001 },
        { ...groundWire, y: -22.0033 },
      ],
    },
  ] satisfies CircuitJson,
}
