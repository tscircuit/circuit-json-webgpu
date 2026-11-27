import { expect, test } from "bun:test"
import { TuningBumpBoard } from "../fixtures/phase-skew/example-boards"
import {
  expectPhaseSkewSnapshot,
  pixelAt,
  renderPhaseSkewFrames,
} from "../fixtures/phase-skew/render-phase-skew"

test("the overlay skips a trace missing from the scene", async () => {
  const [frame] = await renderPhaseSkewFrames({
    board: TuningBumpBoard(),
    editElements: (elements) => {
      const skew = elements.find(
        (element) => element.type === "pcb_differential_pair_phase_skew",
      )
      return elements.filter(
        (element) =>
          element.type !== "pcb_trace" ||
          element.pcb_trace_id !== skew?.negative_trace.pcb_trace_id,
      )
    },
    frameOptions: [{ showDifferentialPairPhaseSkew: true }],
  })
  await expectPhaseSkewSnapshot({ name: "missing-trace", frame })
  expect(pixelAt({ frame, x: 0, y: 0.6 })).toEqual([23, 23, 255])
  expect(pixelAt({ frame, x: 0, y: -0.6 })).toEqual([0, 0, 0])
}, 30_000)
