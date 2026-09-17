import type { AnyCircuitElement, PcbVia } from "circuit-json"
import type { CanvasContext } from "../../types"

type ViaPositionKey = string

export function getViasFromTraces(
  elements: AnyCircuitElement[],
  ctx: CanvasContext,
  contextElements: AnyCircuitElement[] = [],
): PcbVia[] {
  const standaloneVias = [...elements, ...contextElements].filter(
    (element) => element.type === "pcb_via",
  )
  const viasByPosition = new Map<ViaPositionKey, PcbVia[]>()

  for (const via of standaloneVias) {
    const board = ctx.boardOwnerMap?.get(via.pcb_via_id)
    const positionKey = `${board?.pcb_board_id ?? ""}:${via.x}:${via.y}`
    const viasAtPosition = viasByPosition.get(positionKey) ?? []

    viasAtPosition.push(via)
    viasByPosition.set(positionKey, viasAtPosition)
  }

  const traces = elements.filter((element) => element.type === "pcb_trace")
  const routeVias: PcbVia[] = []

  for (const trace of traces) {
    const board = ctx.boardOwnerMap?.get(trace.pcb_trace_id)

    for (const [routeIndex, point] of trace.route.entries()) {
      if (point.route_type !== "via") continue

      const positionKey = `${board?.pcb_board_id ?? ""}:${point.x}:${point.y}`
      const viasAtPosition = viasByPosition.get(positionKey) ?? []
      const hasMatchingVia = viasAtPosition.some(
        (via) =>
          via.layers.includes(point.from_layer) &&
          via.layers.includes(point.to_layer),
      )

      if (hasMatchingVia) continue

      const via: PcbVia = {
        type: "pcb_via",
        pcb_via_id: `${trace.pcb_trace_id}_route_via_${routeIndex}`,
        pcb_trace_id: trace.pcb_trace_id,
        subcircuit_id: trace.subcircuit_id,
        pcb_group_id: trace.pcb_group_id,
        x: point.x,
        y: point.y,
        layers: [point.from_layer, point.to_layer],
        hole_diameter:
          point.hole_diameter ?? board?.min_via_hole_diameter ?? 0.25,
        outer_diameter:
          point.outer_diameter ?? board?.min_via_pad_diameter ?? 0.6,
        tented_on_top: point.tented_on_top,
        tented_on_bottom: point.tented_on_bottom,
      }

      routeVias.push(via)
      viasAtPosition.push(via)
      viasByPosition.set(positionKey, viasAtPosition)
    }
  }

  return routeVias
}
