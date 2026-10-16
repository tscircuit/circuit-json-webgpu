import type { PcbVia } from "circuit-json"
import { createBoardOwnerMap } from "circuit-to-canvas/lib/drawer/create-board-owner-map"
import type { CircuitJson } from "./types"

// Millimetres; match the pinned Canvas renderer's getViasFromTraces defaults.
const DEFAULT_VIA_HOLE_DIAMETER = 0.25
const DEFAULT_VIA_OUTER_DIAMETER = 0.6

/** Materialize route vias without mutating the input or duplicating explicit vias. */
export function getTraceVias(elements: CircuitJson) {
  const owners = createBoardOwnerMap([...elements])
  const viasByPosition = new Map<string, PcbVia[]>()
  const positionKey = (id: string, x: number, y: number) =>
    `${owners.get(id)?.pcb_board_id ?? ""}:${x}:${y}`
  for (const element of elements) {
    if (element.type !== "pcb_via") continue
    const key = positionKey(element.pcb_via_id, element.x, element.y)
    const vias = viasByPosition.get(key) ?? []
    vias.push(element)
    viasByPosition.set(key, vias)
  }

  const result: [number, PcbVia][] = []
  for (const [index, trace] of elements.entries()) {
    if (trace.type !== "pcb_trace") continue
    const board = owners.get(trace.pcb_trace_id)
    for (const [routeIndex, point] of trace.route.entries()) {
      if (point.route_type !== "via") continue
      const key = positionKey(trace.pcb_trace_id, point.x, point.y)
      const vias = viasByPosition.get(key) ?? []
      if (
        vias.some(
          (via) =>
            via.layers.includes(point.from_layer) &&
            via.layers.includes(point.to_layer),
        )
      )
        continue
      const via: PcbVia = {
        type: "pcb_via",
        pcb_via_id: `${trace.pcb_trace_id}_route_via_${routeIndex}`,
        pcb_trace_id: trace.pcb_trace_id,
        pcb_group_id: trace.pcb_group_id,
        subcircuit_id: trace.subcircuit_id,
        x: point.x,
        y: point.y,
        layers: [point.from_layer, point.to_layer],
        hole_diameter:
          point.hole_diameter ??
          board?.min_via_hole_diameter ??
          DEFAULT_VIA_HOLE_DIAMETER,
        outer_diameter:
          point.outer_diameter ??
          board?.min_via_pad_diameter ??
          DEFAULT_VIA_OUTER_DIAMETER,
        tented_on_top: point.tented_on_top,
        tented_on_bottom: point.tented_on_bottom,
      }
      // Use the trace's index so selection and X-Ray include its copper and drill.
      result.push([index, via])
      vias.push(via)
      viasByPosition.set(key, vias)
    }
  }
  return result
}
