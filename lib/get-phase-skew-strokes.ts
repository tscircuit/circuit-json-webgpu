import type {
  PcbDifferentialPairPhaseSkewSegment,
  PcbDifferentialPairPhaseSkewTrace,
} from "circuit-json"
import { normalizeLayer, parseColor } from "./colors"
import type { CircuitJson, Color, RenderOptions } from "./types"

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
  roundStart: boolean
  roundEnd: boolean
}

type LayerStrokes = { joints: PhaseSkewStroke[]; segments: PhaseSkewStroke[] }

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
}: {
  circuitJson: CircuitJson
  colors: RenderOptions["phaseSkewColors"]
}): Map<PhaseSkewLayer, LayerStrokes> {
  const byLayer = new Map<PhaseSkewLayer, LayerStrokes>()
  const palette: PhaseSkewPalette = {
    positive: parseColor(colors?.positive || "blue"),
    negative: parseColor(colors?.negative || "red"),
    zero: parseColor(colors?.zero || "white"),
  }
  for (const element of circuitJson) {
    if (element.type !== "pcb_differential_pair_phase_skew") continue
    addTraceStrokes({ trace: element.positive_trace, palette, byLayer })
    addTraceStrokes({ trace: element.negative_trace, palette, byLayer })
  }
  return byLayer
}

/** Append strokes from one trace to their copper layers. */
function addTraceStrokes({
  trace,
  palette,
  byLayer,
}: {
  trace: PcbDifferentialPairPhaseSkewTrace
  palette: PhaseSkewPalette
  byLayer: Map<PhaseSkewLayer, LayerStrokes>
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
  let roundStart = true
  for (const [index, segment] of trace.segments.entries()) {
    const layer = normalizeLayer(segment.layer)
    const outgoing = trace.segments.at(index + 1)
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
    const pcb_trace_id = trace.pcb_trace_id
    if (joinsOutgoing) {
      const jointColor = getEndpointColor({
        lengthDifferenceMm: outgoing.start_length_difference_mm,
        scale,
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
    strokes.segments.push({
      segment,
      roundStart,
      roundEnd: !joinsOutgoing,
      pcb_trace_id,
      startColor: getEndpointColor({
        lengthDifferenceMm: segment.start_length_difference_mm,
        scale,
      }),
      endColor: getEndpointColor({
        lengthDifferenceMm: segment.end_length_difference_mm,
        scale,
      }),
    })
    roundStart = !joinsOutgoing
  }
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
