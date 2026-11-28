import { expect, test } from "bun:test"
import type { Point } from "circuit-json"
import type { CircuitJson } from "../../lib"
import type { PNG } from "pngjs"
import { ForumExampleBoard } from "../fixtures/phase-skew/forum-example-board"
import {
  expectPhaseSkewSnapshot,
  renderPhaseSkewFrames,
} from "../fixtures/phase-skew/render-phase-skew"

const PIXELS_PER_MM = 248
const CROP_LEFT = 320
const CROP_TOP = 375
// Frame the entry bends and the negative trace's blue-to-red crossing.
const VIEWPORT = {
  width: 540,
  height: 460,
  transform: {
    a: PIXELS_PER_MM,
    b: 0,
    c: 0,
    d: -PIXELS_PER_MM,
    e: 1838 - CROP_LEFT,
    f: 1030 - CROP_TOP,
  },
}

function forumPixel({ frame, x, y }: Point & { frame: PNG }) {
  const offset = ((y - CROP_TOP) * frame.width + x - CROP_LEFT) * 4
  return [...frame.data.subarray(offset, offset + 3)]
}

function negativeTraceId(elements: CircuitJson) {
  const skew = elements.find(
    (element) => element.type === "pcb_differential_pair_phase_skew",
  )
  if (skew === undefined)
    throw new Error("Expected the forum board to emit phase skew")
  return skew.negative_trace.pcb_trace_id
}

// Sample the diagonal where the interior round cap used to create a step.
const CROSSING = { x: 773, y: 447 }

test("the KiCad forum overlay at trace joints", async () => {
  const [rest] = await renderPhaseSkewFrames({
    board: ForumExampleBoard(),
    viewport: VIEWPORT,
    frameOptions: () => [{ showDifferentialPairPhaseSkew: true }],
  })
  // The incoming ramp deepens toward blue at the bend without flattening early.
  expect(forumPixel({ frame: rest, x: 405, y: 796 })).toEqual([239, 239, 255])
  expect(forumPixel({ frame: rest, x: 424, y: 796 })).toEqual([229, 229, 255])
  const crossing = CROSSING
  const rampStart = 753
  const ramp = Array.from(
    { length: crossing.x - rampStart + 1 },
    (_, index) => {
      const x = rampStart + index
      return forumPixel({ frame: rest, x, y: crossing.y + crossing.x - x })
    },
  )
  expect(ramp.at(-1)).toEqual([255, 255, 255])
  const acrossJoint = forumPixel({ frame: rest, x: 774, y: 447 })
  for (const [index, pixel] of [...ramp.slice(1), acrossJoint].entries()) {
    for (const [channel, intensity] of pixel.entries()) {
      expect(Math.abs(intensity - ramp[index][channel])).toBeLessThanOrEqual(2)
    }
  }
  await expectPhaseSkewSnapshot({ name: "kicad-forum-joints", frame: rest })
}, 30_000)

// Hovering the negative trace replaces its skew coloring with hover copper.
test.failing(
  "hovering a pair trace keeps its skew coloring",
  async () => {
    const [rest, hovered, unhovered] = await renderPhaseSkewFrames({
      board: ForumExampleBoard(),
      viewport: VIEWPORT,
      frameOptions: (elements) => [
        { showDifferentialPairPhaseSkew: true },
        { highlightedElementIds: [negativeTraceId(elements)] },
        { highlightedElementIds: [] },
      ],
    })
    expect(unhovered.data.equals(rest.data)).toBe(true)
    for (const point of [CROSSING, { x: 420, y: 639 }]) {
      expect(forumPixel({ frame: hovered, ...point })).toEqual(
        forumPixel({ frame: rest, ...point }),
      )
    }
  },
  30_000,
)
