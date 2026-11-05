import type { PcbTrace, PcbTraceRoutePointWire } from "circuit-json"
import { hasWireTaper } from "./get-wire-taper-polygon"

/** Split vertex-width interpolation at layer changes and explicit outgoing tapers. */
export function getInterpolatedWireRuns(route: PcbTrace["route"]) {
  const runs: PcbTraceRoutePointWire[][] = []
  let run: PcbTraceRoutePointWire[] = []
  for (const point of route) {
    if (point.route_type !== "wire") {
      run = flushInterpolatedWireRun({ run, runs })
      continue
    }
    if (
      ![point.x, point.y, point.width].every(Number.isFinite) ||
      point.width < 0
    )
      throw new Error("Invalid interpolated trace coordinates or width")
    if (run.length && run[0].layer !== point.layer)
      run = flushInterpolatedWireRun({ run, runs })
    run.push(point)
    // Incoming interpolation may end here; this point's outgoing copper is a taper.
    if (hasWireTaper(point)) run = flushInterpolatedWireRun({ run, runs })
  }
  flushInterpolatedWireRun({ run, runs })
  return runs
}

function flushInterpolatedWireRun({
  run,
  runs,
}: {
  run: PcbTraceRoutePointWire[]
  runs: PcbTraceRoutePointWire[][]
}): PcbTraceRoutePointWire[] {
  if (run.length >= 2) runs.push(run)
  return []
}
