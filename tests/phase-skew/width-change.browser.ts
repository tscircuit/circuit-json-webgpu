import { expect, test } from "bun:test"
import { WidthChangeBoard } from "../fixtures/phase-skew/example-boards"
import {
  JOINT_VIEWPORT,
  pixelAt,
  renderPhaseSkewFrames,
} from "../fixtures/phase-skew/render-phase-skew"

test("a width transition covers the wide copper at the outside of the joint", async () => {
  const [copper, overlay] = await renderPhaseSkewFrames({
    board: WidthChangeBoard(),
    viewport: JOINT_VIEWPORT,
    frameOptions: [{}, { showDifferentialPairPhaseSkew: true }],
  })
  const wideCorner = { x: 0.15, y: 0.46, transform: JOINT_VIEWPORT.transform }
  expect(pixelAt({ frame: copper, ...wideCorner })).toEqual([200, 52, 52])
  expect(pixelAt({ frame: overlay, ...wideCorner })).toEqual([255, 255, 255])
}, 30_000)
