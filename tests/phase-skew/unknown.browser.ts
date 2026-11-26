import { expect, test } from "bun:test"
import type { PcbTrace } from "circuit-json"
import type { CircuitJson } from "../../lib"
import {
  pixelAt,
  renderPhaseSkewFrames,
} from "../fixtures/phase-skew/render-phase-skew"

const positiveId = "pcb_trace_positive"
const negativeId = "pcb_trace_negative"
const unrelatedId = "pcb_trace_unrelated"
const trace = (id: string, y: number): PcbTrace => ({
  type: "pcb_trace",
  pcb_trace_id: id,
  route: [
    { route_type: "wire", x: -5, y, width: 0.3, layer: "top" },
    { route_type: "wire", x: 5, y, width: 0.3, layer: "top" },
  ],
})
const knownSkew = (id: string, y: number) => ({
  pcb_trace_id: id,
  segments: [
    {
      start: { x: 0, y },
      end: { x: 5, y },
      layer: "top" as const,
      width: 0.3,
      start_length_difference_mm: 0,
      end_length_difference_mm: 0,
    },
  ],
})
const board: CircuitJson = [
  trace(positiveId, 1),
  trace(negativeId, -1),
  trace(unrelatedId, 2),
  {
    type: "pcb_differential_pair_phase_skew",
    pcb_differential_pair_phase_skew_id: "pcb_differential_pair_phase_skew_0",
    source_bus_id: "source_bus_0",
    positive_trace: knownSkew(positiveId, 1),
    negative_trace: knownSkew(negativeId, -1),
  },
]

test("unknown pair copper is gray beneath known zero and respects the view mode", async () => {
  const [off, on, hover, xRay, restored, disabled] =
    await renderPhaseSkewFrames({
      board,
      frameOptions: [
        { phaseSkewUnknownTraceIds: [positiveId, negativeId] },
        { showDifferentialPairPhaseSkew: true },
        { highlightedElementIds: [positiveId] },
        { highlightedElementIds: [], xRayElementIds: [positiveId] },
        { xRayElementIds: [] },
        { showDifferentialPairPhaseSkew: false },
      ],
    })
  for (const y of [1, -1]) {
    expect(pixelAt({ frame: on, x: -3, y })).toEqual([128, 128, 128])
    expect(pixelAt({ frame: on, x: 3, y })).toEqual([255, 255, 255])
    expect(pixelAt({ frame: off, x: -3, y })).toEqual([200, 52, 52])
  }
  expect(pixelAt({ frame: on, x: -3, y: 2 })).toEqual([200, 52, 52])
  expect(pixelAt({ frame: hover, x: -3, y: 1 })).toEqual([255, 78, 78])
  expect(pixelAt({ frame: hover, x: 3, y: 1 })).toEqual([255, 78, 78])
  expect(pixelAt({ frame: xRay, x: -3, y: 1 })).toEqual([200, 52, 52])
  expect(pixelAt({ frame: xRay, x: 3, y: 1 })).toEqual([200, 52, 52])
  expect(restored.data.equals(on.data)).toBe(true)
  expect(disabled.data.equals(off.data)).toBe(true)
}, 30_000)
