import type { LayerRef, PcbTrace, PcbTraceRoutePointWire } from "circuit-json"

// Splits a trace route into contiguous wire segments by layer.
export function collectTraceSegments(
  route: PcbTrace["route"],
): PcbTraceRoutePointWire[][] {
  const segments: PcbTraceRoutePointWire[][] = []
  let current: PcbTraceRoutePointWire[] = []
  let currentLayer: LayerRef | null = null

  for (const routePoint of route ?? []) {
    if (!routePoint || routePoint.route_type !== "wire") {
      if (current.length >= 2) segments.push(current)
      current = []
      currentLayer = null
      continue
    }

    const layer: LayerRef | null = routePoint.layer ?? currentLayer

    if (!layer) continue

    const x = routePoint.x
    const y = routePoint.y
    if (typeof x !== "number" || typeof y !== "number") continue

    if (typeof routePoint.width !== "number") continue
    const width = routePoint.width

    if (currentLayer && layer !== currentLayer) {
      if (current.length >= 2) segments.push(current)
      current = []
    }

    currentLayer = layer
    current.push(routePoint)
  }

  if (current.length >= 2) segments.push(current)
  return segments
}
