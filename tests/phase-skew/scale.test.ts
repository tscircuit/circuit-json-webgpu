import { expect, expectTypeOf, test } from "bun:test"
import {
  CircuitToWebGpuDrawer,
  getPhaseSkewColor,
  getPhaseSkewStrokes,
  type RenderOptions,
} from "../../lib"
import {
  renderBoard,
  SkewScaleBoard,
  TwoPairScaleBoard,
} from "../fixtures/phase-skew/example-boards"

const white = [1, 1, 1, 1]
const blue = [0, 0, 1, 1] as const
const red = [1, 0, 0, 1]

async function getStrokes({ fullScaleMm }: { fullScaleMm: number }) {
  const elements = await renderBoard({ board: SkewScaleBoard() })
  const pair = elements.find(
    (e) => e.type === "pcb_differential_pair_phase_skew",
  )!
  const { segments, joints } = getPhaseSkewStrokes({
    elements,
    fullScaleMm,
  }).get("top")!
  return {
    positive: segments.filter(
      (s) => s.pcb_trace_id === pair.positive_trace.pcb_trace_id,
    ),
    negative: segments.filter(
      (s) => s.pcb_trace_id === pair.negative_trace.pcb_trace_id,
    ),
    joints,
  }
}

test("the 0 to 2 mm diagonal reaches full blue halfway at 1 mm full scale", async () => {
  const { positive, negative, joints } = await getStrokes({ fullScaleMm: 1 })
  const midpoint = positive[1].segment.end
  expect(midpoint.x).toBe(-8.5)
  expect(midpoint.y).toBeCloseTo(2.6, 12)
  expect(positive[1]).toMatchObject({
    segment: { start: { x: -10, y: 0.6 }, end: midpoint },
    startColor: white,
    endColor: blue,
    roundEnd: false,
  })
  expect(positive[2]).toMatchObject({
    segment: { start: midpoint, end: { x: -7, y: 4.6 } },
    startColor: blue,
    endColor: blue,
    roundStart: false,
  })
  expect(
    joints.filter(
      (s) =>
        s.segment.start.x === midpoint.x && s.segment.start.y === midpoint.y,
    ),
  ).toMatchObject([
    {
      segment: { end: midpoint, width: 0.24 },
      startColor: blue,
      endColor: blue,
    },
  ])
  // The returning negative diagonal crosses the same limit in reverse.
  const falling = negative.find((s) => s.segment.start.x === 8.5)!
  expect(falling).toMatchObject({
    startColor: red,
    endColor: white,
    roundStart: false,
  })
})

test("a zero limit gives every nonzero part full color", async () => {
  const { positive, negative } = await getStrokes({ fullScaleMm: 0 })
  expect(positive[0]).toMatchObject({ startColor: white, endColor: white })
  expect(positive[1]).toMatchObject({
    startColor: white,
    endColor: blue,
    bodyColorEndpoint: "end",
  })
  expect(negative.at(-2)).toMatchObject({
    startColor: red,
    endColor: white,
    bodyColorEndpoint: "start",
  })
  expect(negative.at(-1)).toMatchObject({ startColor: white, endColor: white })
})

test("one board shows 1 mm of skew at full color on the mapped pair and half color on the other", async () => {
  const elements = await renderBoard({ board: TwoPairScaleBoard() })
  const pairs = elements.filter(
    (e) => e.type === "pcb_differential_pair_phase_skew",
  )
  expect(pairs).toHaveLength(2)
  const [mapped, fallback] = pairs
  expect(mapped.source_bus_id).not.toBe(fallback.source_bus_id)
  const { segments } = getPhaseSkewStrokes({
    elements,
    fullScaleMm: 2,
    fullScaleMmBySourceBusId: { [mapped.source_bus_id]: 1 },
  }).get("top")!
  for (const [pair, expected] of [
    [mapped, blue],
    [fallback, [0.5, 0.5, 1, 1]],
  ] as const) {
    const diagonal = pair.positive_trace.segments.find(
      (s) => s.end_length_difference_mm === 1,
    )!
    expect(
      segments.find(
        (s) =>
          s.pcb_trace_id === pair.positive_trace.pcb_trace_id &&
          s.segment.end.x === diagonal.end.x &&
          s.segment.end.y === diagonal.end.y,
      )?.endColor,
    ).toEqual(expected)
  }
})

test("all three custom colors interpolate and saturate at full scale", () => {
  const colors = { zero: "black", positive: "lime", negative: "aqua" }
  const differences = [0, 1, -1, 3, -3]
  expect(
    differences.map((lengthDifferenceMm) =>
      getPhaseSkewColor({ lengthDifferenceMm, fullScaleMm: 2, colors }),
    ),
  ).toEqual([
    [0, 0, 0, 1],
    [0, 0.5, 0, 1],
    [0, 0.5, 0.5, 1],
    [0, 1, 0, 1],
    [0, 1, 1, 1],
  ])
})

test("enabling the overlay requires a finite, nonnegative scale", () => {
  expectTypeOf<{
    showDifferentialPairPhaseSkew: boolean
    phaseSkewFullScaleMm: number
  }>().toMatchTypeOf<RenderOptions>()
  // An empty canvas exercises the public option validation without a GPU device.
  const drawer: CircuitToWebGpuDrawer = Object.assign(
    Object.create(CircuitToWebGpuDrawer.prototype),
    { canvas: { width: 0, height: 0 } },
  )
  expect(() =>
    // @ts-expect-error Enabling the overlay requires an explicit full scale.
    drawer.render({ showDifferentialPairPhaseSkew: true }),
  ).toThrow("phaseSkewFullScaleMm")
  for (const phaseSkewFullScaleMm of [-1, NaN, Infinity]) {
    expect(() =>
      drawer.render({
        showDifferentialPairPhaseSkew: true,
        phaseSkewFullScaleMm,
      }),
    ).toThrow("phaseSkewFullScaleMm")
    expect(() =>
      drawer.render({
        showDifferentialPairPhaseSkew: true,
        phaseSkewFullScaleMm: 2,
        phaseSkewFullScaleMmBySourceBusId: { unused: phaseSkewFullScaleMm },
      }),
    ).toThrow("phaseSkewFullScaleMmBySourceBusId[unused]")
  }
  drawer.render({
    showDifferentialPairPhaseSkew: true,
    phaseSkewFullScaleMm: 0,
  })
  expect(() => drawer.render({ phaseSkewFullScaleMm: NaN })).toThrow(
    "phaseSkewFullScaleMm",
  )
  drawer.render()
})
