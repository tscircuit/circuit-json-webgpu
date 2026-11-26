import { expect, test } from "bun:test"
import { HairpinBoard } from "../fixtures/phase-skew/example-boards"
import {
  JOINT_VIEWPORT,
  pixelAt,
  renderPhaseSkewFrames,
} from "../fixtures/phase-skew/render-phase-skew"

test("the overlay covers the outer edge of a 170-degree hairpin", async () => {
  const [copper, overlay] = await renderPhaseSkewFrames({
    board: HairpinBoard(),
    viewport: JOINT_VIEWPORT,
    frameOptions: [{}, { showDifferentialPairPhaseSkew: true }],
  })
  const outerCorner = { x: 0.09, y: 0.55, transform: JOINT_VIEWPORT.transform }
  expect(pixelAt({ frame: copper, ...outerCorner })).toEqual([200, 52, 52])
  expect(pixelAt({ frame: overlay, ...outerCorner })).toEqual([255, 255, 255])
}, 30_000)
