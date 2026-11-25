import { test } from "bun:test"
import { ForumExampleBoard } from "../fixtures/phase-skew/forum-example-board"
import {
  expectPhaseSkewSnapshot,
  renderPhaseSkewFrames,
} from "../fixtures/phase-skew/render-phase-skew"

const PIXELS_PER_MM = 248
// Frame the entry bends and the negative trace's blue-to-red crossing.
const VIEWPORT = {
  width: 540,
  height: 460,
  transform: {
    a: PIXELS_PER_MM,
    b: 0,
    c: 0,
    d: -PIXELS_PER_MM,
    e: 1518,
    f: 655,
  },
}

test("the KiCad forum overlay at trace joints and during hover", async () => {
  const [rest, hovered] = await renderPhaseSkewFrames({
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
      ]
    },
  })
  await expectPhaseSkewSnapshot({ name: "kicad-forum-joints", frame: rest })
  await expectPhaseSkewSnapshot({ name: "kicad-forum-hover", frame: hovered })
}, 30_000)
