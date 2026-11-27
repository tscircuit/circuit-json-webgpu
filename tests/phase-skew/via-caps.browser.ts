import { expect, test } from "bun:test"
import { LayerChangeBoard } from "../fixtures/phase-skew/example-boards"
import {
  JOINT_VIEWPORT,
  pixelAt,
  renderPhaseSkewFrames,
} from "../fixtures/phase-skew/render-phase-skew"

test("each copper layer keeps its round cap at the via", async () => {
  const [top, bottom] = await renderPhaseSkewFrames({
    board: LayerChangeBoard(),
    viewport: JOINT_VIEWPORT,
    frameOptions: [
      {
        showDifferentialPairPhaseSkew: true,
        phaseSkewFullScaleMm: 2,
        layers: ["top"],
      },
      {
        showDifferentialPairPhaseSkew: true,
        phaseSkewFullScaleMm: 2,
        layers: ["bottom"],
      },
    ],
  })
  const transform = JOINT_VIEWPORT.transform
  // Each point is on the far side of the via center from the respective run.
  expect(pixelAt({ frame: top, x: 0.11, y: 0.62, transform })).toEqual([
    139, 139, 255,
  ])
  expect(pixelAt({ frame: bottom, x: -0.11, y: 0.62, transform })).toEqual([
    139, 139, 255,
  ])
}, 30_000)
