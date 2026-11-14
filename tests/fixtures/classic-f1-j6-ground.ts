import type { CircuitJson } from "../../lib"
import circuit from "./classic-f1-j6.circuit.json"

// The left side of the published Classic F1 v6.0.7 board, from the FRAM to
// the regulator. The fixture keeps the routed records and crops the GND pour
// to this viewport. The sampled segment is the ground run below the J6 tab.
export const classicF1J6Ground = {
  elements: circuit as CircuitJson,
  groundSpans: [
    { id: "pcb_trace_external_163", midpoint: { x: -19.475, y: -14.4017 } },
    { id: "pcb_trace_external_141", midpoint: { x: -21.5344, y: 13.53855 } },
    { id: "pcb_trace_external_166", midpoint: { x: -17.6825, y: 28.77 } },
  ],
  viewport: { minX: -36, minY: -32, maxX: -10, maxY: 32 },
}
