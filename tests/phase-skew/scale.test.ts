import { expect, test } from "bun:test"
import { getPhaseSkewStrokes } from "../../lib/get-phase-skew-strokes"
import {
  renderBoard,
  SkewScaleBoard,
} from "../fixtures/phase-skew/example-boards"

const white = [1, 1, 1, 1]
const blue = [0, 0, 1, 1]
const red = [1, 0, 0, 1]

async function getStrokes(maxLengthSkew?: number, omitBus = false) {
  const board = await renderBoard({ board: SkewScaleBoard({ maxLengthSkew }) })
  const pair = board.find((e) => e.type === "pcb_differential_pair_phase_skew")!
  // The overlay precedes its bus, and the board also includes a separate 8 mm bus.
  const circuitJson = board
    .toReversed()
    .filter(
      (e) =>
        !omitBus ||
        e.type !== "source_bus" ||
        e.source_bus_id !== pair.source_bus_id,
    )
  const { segments, joints } = getPhaseSkewStrokes({
    circuitJson,
    colors: undefined,
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

test("the 0 to 2 mm diagonal reaches full blue halfway at a 1 mm bus limit", async () => {
  const { positive, negative, joints } = await getStrokes(1)
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

test.each([false, true])(
  "the default scale is 2 mm (bus omitted: %s)",
  async (omitBus) => {
    const { positive } = await getStrokes(undefined, omitBus)
    const ramp = positive[1]
    expect(ramp).toMatchObject({
      segment: { start: { x: -10, y: 0.6 }, end: { x: -7, y: 4.6 } },
      startColor: white,
      endColor: blue,
    })
    expect(
      ramp.startColor.map((channel, i) => (channel + ramp.endColor[i]) / 2),
    ).toEqual([0.5, 0.5, 1, 1])
  },
)

test("a zero limit gives every nonzero part full color", async () => {
  const { positive, negative } = await getStrokes(0)
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
