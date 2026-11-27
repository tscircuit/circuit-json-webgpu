import { expect, test } from "bun:test"
import { ShortChamferBoard } from "../fixtures/phase-skew/example-boards"
import {
  JOINT_VIEWPORT,
  pixelAt,
  renderPhaseSkewFrames,
} from "../fixtures/phase-skew/render-phase-skew"

test("a sub-width chamfer covers copper and keeps the incoming gradient", async () => {
  const [copper, overlay] = await renderPhaseSkewFrames({
    board: ShortChamferBoard(),
    viewport: JOINT_VIEWPORT,
    frameOptions: [{}, { showDifferentialPairPhaseSkew: true }],
  })
  const transform = JOINT_VIEWPORT.transform
  const outerCorner = { x: 0.15, y: 0.65, transform }
  expect(pixelAt({ frame: copper, ...outerCorner })).toEqual([200, 52, 52])
  expect(pixelAt({ frame: overlay, ...outerCorner })[2]).toBe(255)
  expect(pixelAt({ frame: overlay, x: -0.075, y: 0.648, transform })).toEqual([
    255, 255, 255,
  ])
}, 30_000)
