import type { CircuitJson } from "../lib"
import type { Fixture } from "./fixtures"

// Two independent nets with through vias and plated holes.
const elements = ["selected", "unrelated"].flatMap((net, i) => [
  {
    type: "pcb_via",
    pcb_via_id: `${net}_via`,
    x: -8,
    y: 5 - i * 10,
    outer_diameter: 3,
    hole_diameter: 1.5,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: `${net}_hole`,
    shape: "circle",
    x: 8,
    y: 5 - i * 10,
    outer_diameter: 4,
    hole_diameter: 2,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: `${net}_trace`,
    route: [
      { route_type: "wire", x: -8, y: 5 - i * 10, layer: "top", width: 1 },
      { route_type: "wire", x: 8, y: 5 - i * 10, layer: "top", width: 1 },
    ],
  },
]) as CircuitJson

export const xRayFixtures: Record<string, Fixture> = {
  "x-ray-drills-before": { elements },
  "x-ray-drills": {
    elements,
    options: {
      xRayElementIds: ["selected_via", "selected_hole", "selected_trace"],
      hiddenLayerOpacity: 0.05,
    },
  },
}
