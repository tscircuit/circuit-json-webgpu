import type {
  PcbDifferentialPairPhaseSkewSegment,
  PcbDifferentialPairPhaseSkewTrace,
} from "circuit-json"
import { normalizeLayer, parseColor } from "./colors"
import type { CircuitJson, Color, RenderOptions } from "./types"

export type PhaseSkewLayer = ReturnType<typeof normalizeLayer>

/** A PCB segment and the two colors that the stroke interpolates between. */
export type PhaseSkewStroke = {
  segment: PcbDifferentialPairPhaseSkewSegment
  startColor: Color
  endColor: Color
}

type PhaseSkewPalette = {
  positive: Color
  negative: Color
  zero: Color
}

type PhaseSkewScale = {
  positivePeakMm: number
  negativePeakMm: number
  palette: PhaseSkewPalette
}

const DEFAULT_PALETTE: PhaseSkewPalette = {
  positive: [0, 0, 1, 1],
  negative: [1, 0, 0, 1],
  zero: [1, 1, 1, 1],
}

/** Color the known segments using each trace's positive and negative peaks. */
export function getPhaseSkewStrokes({
  circuitJson,
  colors,
}: {
  circuitJson: CircuitJson
  colors: RenderOptions["phaseSkewColors"]
}): Map<PhaseSkewLayer, PhaseSkewStroke[]> {
  const byLayer = new Map<PhaseSkewLayer, PhaseSkewStroke[]>()
  const palette: PhaseSkewPalette = {
    positive: colors?.positive
      ? parseColor(colors.positive)
      : DEFAULT_PALETTE.positive,
    negative: colors?.negative
      ? parseColor(colors.negative)
      : DEFAULT_PALETTE.negative,
    zero: colors?.zero ? parseColor(colors.zero) : DEFAULT_PALETTE.zero,
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
  byLayer: Map<PhaseSkewLayer, PhaseSkewStroke[]>
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
  for (const segment of trace.segments) {
    const layer = normalizeLayer(segment.layer)
    const stroke = {
      segment,
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
