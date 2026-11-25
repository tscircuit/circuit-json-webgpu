import { expect, test } from "bun:test"
import type { Point } from "circuit-json"
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

test("the KiCad forum overlay at trace joints and during hover", async () => {
  const [rest, hovered, unhovered] = await renderPhaseSkewFrames({
    board: ForumExampleBoard(),
    viewport: VIEWPORT,
    frameOptions: (elements) => {
      const skew = elements.find(
        (element) => element.type === "pcb_differential_pair_phase_skew",
      )
      if (skew === undefined)
        throw new Error("Expected the forum board to emit phase skew")
      return [
        { showDifferentialPairPhaseSkew: true },
        { highlightedElementIds: [skew.negative_trace.pcb_trace_id] },
        { highlightedElementIds: [] },
      ]
    },
  })
  // The incoming ramp reaches blue at the bend without flattening early.
  expect(forumPixel({ frame: rest, x: 405, y: 796 })).toEqual([234, 234, 255])
  expect(forumPixel({ frame: rest, x: 424, y: 796 })).toEqual([222, 222, 255])
  // Sample the diagonal where the interior round cap used to create a step.
  const crossing = { x: 773, y: 447 }
  const rampStart = 753
  const ramp = Array.from(
    { length: crossing.x - rampStart + 1 },
    (_, index) => {
      const x = rampStart + index
      return forumPixel({ frame: rest, x, y: crossing.y + crossing.x - x })[0]
    },
  )
  expect(ramp.at(-1)).toBe(255)
  expect(
    Math.max(...ramp.slice(1).map((red, i) => Math.abs(red - ramp[i]))),
  ).toBeLessThanOrEqual(2)
  expect(forumPixel({ frame: hovered, ...crossing })).toEqual([255, 78, 78])
  expect(forumPixel({ frame: hovered, x: 420, y: 639 })).toEqual([
    255, 194, 194,
  ])
  expect(unhovered.data.equals(rest.data)).toBe(true)
  await expectPhaseSkewSnapshot({ name: "kicad-forum-joints", frame: rest })
  await expectPhaseSkewSnapshot({ name: "kicad-forum-hover", frame: hovered })
}, 30_000)
