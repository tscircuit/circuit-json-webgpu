import type {
  PcbDifferentialPairPhaseSkewSegment,
  PcbDifferentialPairPhaseSkewTrace,
} from "circuit-json"
import { normalizeLayer, parseColor } from "./colors"
import type { CircuitJson, Color, RenderOptions } from "./types"

export type PhaseSkewLayer = ReturnType<typeof normalizeLayer>

export const DEFAULT_PHASE_SKEW_FULL_SCALE_MM = 2

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

type PhaseSkewPalette = Record<
  keyof NonNullable<RenderOptions["phaseSkewColors"]>,
  Color
>

export function getPhaseSkewFullScaleMmBySourceBusId({
  elements,
}: { elements: CircuitJson }): Record<string, number> {
  const fullScaleMmBySourceBusId: Record<string, number> = Object.create(null)
  for (const element of elements) {
    if (element.type === "source_bus" && element.max_length_skew !== undefined)
      fullScaleMmBySourceBusId[element.source_bus_id] = element.max_length_skew
  }
  return fullScaleMmBySourceBusId
}

export function getPhaseSkewStrokes({
  elements,
  colors,
}: {
  elements: CircuitJson
  colors: RenderOptions["phaseSkewColors"]
}): Map<PhaseSkewLayer, LayerStrokes> {
  const byLayer = new Map<PhaseSkewLayer, LayerStrokes>()
  const palette: PhaseSkewPalette = {
    positive: parseColor(colors?.positive || "blue"),
    negative: parseColor(colors?.negative || "red"),
    zero: parseColor(colors?.zero || "white"),
  }
  const fullScaleMmBySourceBusId = getPhaseSkewFullScaleMmBySourceBusId({
    elements,
  })
  const pcbTraceIds = new Set(
    elements.flatMap((element) =>
      element.type === "pcb_trace" ? [element.pcb_trace_id] : [],
    ),
  )
  for (const element of elements) {
    if (element.type !== "pcb_differential_pair_phase_skew") continue
    const fullScaleMm =
      fullScaleMmBySourceBusId[element.source_bus_id] ??
      DEFAULT_PHASE_SKEW_FULL_SCALE_MM
    for (const trace of [element.positive_trace, element.negative_trace])
      if (pcbTraceIds.has(trace.pcb_trace_id))
        addTraceStrokes({ trace, fullScaleMm, colors: palette, byLayer })
  }
  return byLayer
}

/** Append strokes from one trace to their copper layers. */
function addTraceStrokes({
  trace,
  fullScaleMm,
  colors,
  byLayer,
}: {
  trace: PcbDifferentialPairPhaseSkewTrace
  fullScaleMm: number
  colors: PhaseSkewPalette
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
      const jointColor = getPhaseSkewColor({
        lengthDifferenceMm: outgoing.start_length_difference_mm,
        fullScaleMm,
        colors,
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
      startColor: getPhaseSkewColor({
        lengthDifferenceMm: start,
        fullScaleMm,
        colors,
      }),
      endColor: getPhaseSkewColor({
        lengthDifferenceMm: segment.end_length_difference_mm,
        fullScaleMm,
        colors,
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
}: {
  lengthDifferenceMm: number
  fullScaleMm: number
  colors: PhaseSkewPalette
}): Color {
  if (lengthDifferenceMm === 0) return colors.zero
  const peakColor = lengthDifferenceMm > 0 ? colors.positive : colors.negative
  const magnitude = Math.abs(lengthDifferenceMm)
  if (magnitude >= fullScaleMm) return peakColor
  const fraction = magnitude / fullScaleMm
  const [red, green, blue, alpha] = colors.zero
  return [
    red + (peakColor[0] - red) * fraction,
    green + (peakColor[1] - green) * fraction,
    blue + (peakColor[2] - blue) * fraction,
    alpha + (peakColor[3] - alpha) * fraction,
  ]
}
