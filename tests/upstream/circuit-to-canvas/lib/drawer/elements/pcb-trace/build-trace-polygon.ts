import type { PcbTraceRoutePointWire } from "circuit-json"
import { getTraceDirectionAt } from "./get-trace-direction-at"
import { normalizeTraceDirection } from "./normalize-trace-direction"

// Builds a filled polygon representing a variable-width trace segment.
export function buildTracePolygon(
  points: PcbTraceRoutePointWire[],
): Array<{ x: number; y: number }> {
  const left: Array<{ x: number; y: number }> = []
  const right: Array<{ x: number; y: number }> = []

  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    if (!point) continue
    const dir = getTraceDirectionAt(points, i)
    const normal = normalizeTraceDirection(-dir.y, dir.x)
    const offset = point.width / 2

    left.push({
      x: point.x + normal.x * offset,
      y: point.y + normal.y * offset,
    })
    right.push({
      x: point.x - normal.x * offset,
      y: point.y - normal.y * offset,
    })
  }

  return left.concat(right.reverse())
}
