import type {
  PcbDifferentialPairPhaseSkewSegment,
  PcbDifferentialPairPhaseSkewTrace,
} from "circuit-json"
import { normalizeLayer, parseColor } from "./colors"
import type { CircuitJson, Color, Point, RenderOptions } from "./types"

export type PhaseSkewLayer = ReturnType<typeof normalizeLayer>
export type PcbTraceId = PcbDifferentialPairPhaseSkewTrace["pcb_trace_id"]

/** KiCad draws the overlay 10% wider to cover the copper edges. */
export const PHASE_SKEW_WIDTH_FACTOR = 1.1
const MIN_JOIN_LENGTH_MM = 1e-6
const MIN_JOIN_DENOMINATOR = 1e-6

/** A PCB segment and the two colors that the stroke interpolates between. */
export type PhaseSkewStroke = {
  segment: PcbDifferentialPairPhaseSkewSegment
  startColor: Color
  endColor: Color
  startJoin?: Point
  endJoin?: Point
  highlightIndex: number
}

type PhaseSkewPalette = Record<
  keyof NonNullable<RenderOptions["phaseSkewColors"]>,
  Color
>

type PhaseSkewScale = {
  positivePeakMm: number
  negativePeakMm: number
  palette: PhaseSkewPalette
}

/** Color the known segments using each trace's positive and negative peaks. */
export function getPhaseSkewStrokes({
  circuitJson,
  colors,
  highlightIndices,
}: {
  circuitJson: CircuitJson
  colors: RenderOptions["phaseSkewColors"]
  highlightIndices: ReadonlyMap<PcbTraceId, number>
}): Map<PhaseSkewLayer, PhaseSkewStroke[]> {
  const byLayer = new Map<PhaseSkewLayer, PhaseSkewStroke[]>()
  const palette: PhaseSkewPalette = {
    positive: parseColor(colors?.positive || "blue"),
    negative: parseColor(colors?.negative || "red"),
    zero: parseColor(colors?.zero || "white"),
  }
  for (const element of circuitJson) {
    if (element.type !== "pcb_differential_pair_phase_skew") continue
    for (const trace of [element.positive_trace, element.negative_trace]) {
      addTraceStrokes({
        trace,
        palette,
        byLayer,
        highlightIndex: highlightIndices.get(trace.pcb_trace_id) ?? -1,
      })
    }
  }
  return byLayer
}

/** Append strokes from one trace to their copper layers. */
function addTraceStrokes({
  trace,
  palette,
  byLayer,
  highlightIndex,
}: {
  trace: PcbDifferentialPairPhaseSkewTrace
  palette: PhaseSkewPalette
  byLayer: Map<PhaseSkewLayer, PhaseSkewStroke[]>
  highlightIndex: number
}): void {
  let positivePeakMm = 0
  let negativePeakMm = 0
  for (const segment of trace.segments) {
    const { start_length_difference_mm, end_length_difference_mm } = segment
    positivePeakMm = Math.max(
      positivePeakMm,
      start_length_difference_mm,
      end_length_difference_mm,
    )
    negativePeakMm = Math.min(
      negativePeakMm,
      start_length_difference_mm,
      end_length_difference_mm,
    )
  }
  const scale = { positivePeakMm, negativePeakMm, palette }
  let startJoin: Point | undefined
  for (const [index, segment] of trace.segments.entries()) {
    const layer = normalizeLayer(segment.layer)
    const endJoin = getSharedCut({
      incoming: segment,
      outgoing: trace.segments[index + 1],
    })
    const stroke = {
      segment,
      startJoin,
      endJoin,
      highlightIndex,
      startColor: getEndpointColor({
        lengthDifferenceMm: segment.start_length_difference_mm,
        scale,
      }),
      endColor: getEndpointColor({
        lengthDifferenceMm: segment.end_length_difference_mm,
        scale,
      }),
    }
    const strokes = byLayer.get(layer)
    if (strokes) strokes.push(stroke)
    else byLayer.set(layer, [stroke])
    startJoin = endJoin
  }
}

/** Share the miter cut between consecutive strokes on the same layer. */
function getSharedCut({
  incoming,
  outgoing,
}: {
  incoming: PcbDifferentialPairPhaseSkewSegment
  outgoing?: PcbDifferentialPairPhaseSkewSegment
}): Point | undefined {
  if (
    !outgoing ||
    normalizeLayer(incoming.layer) !== normalizeLayer(outgoing.layer) ||
    incoming.end.x !== outgoing.start.x ||
    incoming.end.y !== outgoing.start.y
  ) {
    return
  }
  const ax = incoming.end.x - incoming.start.x
  const ay = incoming.end.y - incoming.start.y
  const bx = outgoing.end.x - outgoing.start.x
  const by = outgoing.end.y - outgoing.start.y
  const incomingLengthMm = Math.hypot(ax, ay)
  const outgoingLengthMm = Math.hypot(bx, by)
  if (Math.min(incomingLengthMm, outgoingLengthMm) <= MIN_JOIN_LENGTH_MM) return

  const x = -ay / incomingLengthMm - by / outgoingLengthMm
  const y = ax / incomingLengthMm + bx / outgoingLengthMm
  const denominator =
    1 + (ax * bx + ay * by) / (incomingLengthMm * outgoingLengthMm)
  if (denominator <= MIN_JOIN_DENOMINATOR) return

  // Keep neighboring cuts from crossing on very short segments or sharp turns.
  const along = Math.abs((x * ax + y * ay) / incomingLengthMm)
  const widthMm =
    Math.max(incoming.width, outgoing.width) * PHASE_SKEW_WIDTH_FACTOR
  const maxScale =
    Math.min(incomingLengthMm, outgoingLengthMm) / (along * widthMm)
  const scale = Math.min(1 / denominator, maxScale)
  return { x: x * scale, y: y * scale }
}

/** Interpolate from zero to the full color of the endpoint's sign. */
function getEndpointColor({
  lengthDifferenceMm,
  scale,
}: {
  lengthDifferenceMm: number
  scale: PhaseSkewScale
}): Color {
  const { positivePeakMm, negativePeakMm, palette } = scale
  if (lengthDifferenceMm === 0) return palette.zero
  const peakMm = lengthDifferenceMm > 0 ? positivePeakMm : negativePeakMm
  const peakColor = lengthDifferenceMm > 0 ? palette.positive : palette.negative
  const fraction = lengthDifferenceMm / peakMm
  const [red, green, blue, alpha] = palette.zero
  return [
    red + (peakColor[0] - red) * fraction,
    green + (peakColor[1] - green) * fraction,
    blue + (peakColor[2] - blue) * fraction,
    alpha + (peakColor[3] - alpha) * fraction,
  ]
}
