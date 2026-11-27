import type {
  PcbDifferentialPairPhaseSkewSegment,
  PcbDifferentialPairPhaseSkewTrace,
} from "circuit-json"
import { normalizeLayer, parseColor } from "./colors"
import type { CircuitJson, Color, PhaseSkewColors } from "./types"

export type PhaseSkewLayer = ReturnType<typeof normalizeLayer>

const JOINT_TOLERANCE_MM = 1e-6

/** A PCB segment and the two colors that the stroke interpolates between. */
export type PhaseSkewStroke = Pick<
  PcbDifferentialPairPhaseSkewTrace,
  "pcb_trace_id"
> & {
  segment: Pick<PcbDifferentialPairPhaseSkewSegment, "start" | "end" | "width">
  startColor: Color
  endColor: Color
  /** At a zero skew limit the body uses one endpoint color, while each cap keeps its own. */
  bodyColorEndpoint?: "start" | "end"
  roundStart: boolean
  roundEnd: boolean
}

type LayerStrokes = { joints: PhaseSkewStroke[]; segments: PhaseSkewStroke[] }

type ColorScale = { fullScaleMm: number; colors?: PhaseSkewColors }

export function getPhaseSkewStrokes({
  elements,
  fullScaleMm,
  fullScaleMmBySourceBusId,
  colors,
}: {
  elements: CircuitJson
  fullScaleMmBySourceBusId?: Record<string, number>
} & ColorScale): Map<PhaseSkewLayer, LayerStrokes> {
  const byLayer = new Map<PhaseSkewLayer, LayerStrokes>()
  const colorAt = createPhaseSkewColorScale({ colors })
  for (const element of elements) {
    if (element.type !== "pcb_differential_pair_phase_skew") continue
    const pairFullScaleMm =
      fullScaleMmBySourceBusId?.[element.source_bus_id] ?? fullScaleMm
    for (const trace of [element.positive_trace, element.negative_trace])
      addTraceStrokes({ trace, fullScaleMm: pairFullScaleMm, colorAt, byLayer })
  }
  return byLayer
}

/** Append strokes from one trace to their copper layers. */
function addTraceStrokes({
  trace,
  fullScaleMm,
  colorAt,
  byLayer,
}: {
  trace: PcbDifferentialPairPhaseSkewTrace
  fullScaleMm: number
  colorAt: ReturnType<typeof createPhaseSkewColorScale>
  byLayer: Map<PhaseSkewLayer, LayerStrokes>
}): void {
  const segments = trace.segments.flatMap((segment) =>
    splitPhaseSkewSegmentAtFullScale({ segment, fullScaleMm }),
  )
  const { pcb_trace_id } = trace
  let roundStart = true
  for (const [index, segment] of segments.entries()) {
    const layer = normalizeLayer(segment.layer)
    const outgoing = segments.at(index + 1)
    const joinsOutgoing =
      outgoing !== undefined &&
      layer === normalizeLayer(outgoing.layer) &&
      Math.hypot(
        segment.end.x - outgoing.start.x,
        segment.end.y - outgoing.start.y,
      ) <= JOINT_TOLERANCE_MM

    let strokes = byLayer.get(layer)
    if (strokes === undefined) {
      strokes = { joints: [], segments: [] }
      byLayer.set(layer, strokes)
    }
    if (joinsOutgoing) {
      const jointColor = colorAt({
        lengthDifferenceMm: outgoing.start_length_difference_mm,
        fullScaleMm,
      })
      strokes.joints.push({
        segment: {
          start: outgoing.start,
          end: outgoing.start,
          width: Math.max(segment.width, outgoing.width),
        },
        pcb_trace_id,
        startColor: jointColor,
        endColor: jointColor,
        roundStart: true,
        roundEnd: true,
      })
    }

    const start = segment.start_length_difference_mm
    const stroke: PhaseSkewStroke = {
      segment,
      roundStart,
      roundEnd: !joinsOutgoing,
      pcb_trace_id,
      startColor: colorAt({
        lengthDifferenceMm: start,
        fullScaleMm,
      }),
      endColor: colorAt({
        lengthDifferenceMm: segment.end_length_difference_mm,
        fullScaleMm,
      }),
    }
    if (fullScaleMm === 0)
      stroke.bodyColorEndpoint = start === 0 ? "end" : "start"
    strokes.segments.push(stroke)
    roundStart = !joinsOutgoing
  }
}

/** Split only interior crossings. A segment's two differences have the same sign. */
export function splitPhaseSkewSegmentAtFullScale({
  segment,
  fullScaleMm,
}: {
  segment: PcbDifferentialPairPhaseSkewSegment
  fullScaleMm: number
}): PcbDifferentialPairPhaseSkewSegment[] {
  const startMm = segment.start_length_difference_mm
  const endMm = segment.end_length_difference_mm
  const limitMm = startMm < 0 || endMm < 0 ? -fullScaleMm : fullScaleMm
  if (
    limitMm <= Math.min(startMm, endMm) ||
    limitMm >= Math.max(startMm, endMm)
  )
    return [segment]

  const t = (limitMm - startMm) / (endMm - startMm)
  const { start, end } = segment
  const point = {
    x: start.x + t * (end.x - start.x),
    y: start.y + t * (end.y - start.y),
  }
  return [
    { ...segment, end: point, end_length_difference_mm: limitMm },
    { ...segment, start: point, start_length_difference_mm: limitMm },
  ]
}

export function getPhaseSkewColor({
  lengthDifferenceMm,
  fullScaleMm,
  colors,
}: { lengthDifferenceMm: number } & ColorScale): Color {
  return createPhaseSkewColorScale({ colors })({
    lengthDifferenceMm,
    fullScaleMm,
  })
}

/** Parse the three CSS colors once for all endpoints in an overlay. */
function createPhaseSkewColorScale({ colors }: { colors?: PhaseSkewColors }) {
  const zero = parseColor(colors?.zero || "white")
  const positive = parseColor(colors?.positive || "blue")
  const negative = parseColor(colors?.negative || "red")
  return ({
    lengthDifferenceMm,
    fullScaleMm,
  }: { lengthDifferenceMm: number; fullScaleMm: number }): Color => {
    if (lengthDifferenceMm === 0) return zero
    const peak = lengthDifferenceMm > 0 ? positive : negative
    const magnitude = Math.abs(lengthDifferenceMm)
    if (magnitude >= fullScaleMm) return peak
    const fraction = magnitude / fullScaleMm
    const [r, g, b, a] = zero
    return [
      r + (peak[0] - r) * fraction,
      g + (peak[1] - g) * fraction,
      b + (peak[2] - b) * fraction,
      a + (peak[3] - a) * fraction,
    ]
  }
}
