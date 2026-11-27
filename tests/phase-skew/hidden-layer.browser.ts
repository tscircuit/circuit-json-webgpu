import { expect, test } from "bun:test"
import { LayerChangeBoard } from "../fixtures/phase-skew/example-boards"
import {
  expectPhaseSkewSnapshot,
  pixelAt,
  renderPhaseSkewFrames,
} from "../fixtures/phase-skew/render-phase-skew"

test("the overlay follows copper visibility and leaves drills visible", async () => {
  const [visible, hidden] = await renderPhaseSkewFrames({
    board: LayerChangeBoard(),
    frameOptions: [
      { showDifferentialPairPhaseSkew: true },
      { layers: ["top", "drill", "edge_cuts"] },
    ],
  })
  expect(pixelAt({ frame: visible, x: 3, y: 0.6 })).toEqual([139, 139, 255])
  expect(pixelAt({ frame: hidden, x: 3, y: 0.6 })).toEqual([0, 0, 0])
  for (const frame of [visible, hidden]) {
    expect(pixelAt({ frame, x: 0, y: 0.6 })).toEqual([255, 38, 226])
  }
  await expectPhaseSkewSnapshot({ name: "bottom-visible", frame: visible })
  await expectPhaseSkewSnapshot({ name: "bottom-hidden", frame: hidden })
}, 30_000)
