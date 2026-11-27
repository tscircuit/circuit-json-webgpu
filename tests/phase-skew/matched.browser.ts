import { expect, test } from "bun:test"
import { MatchedPairBoard } from "../fixtures/phase-skew/example-boards"
import {
  expectPhaseSkewSnapshot,
  pixelAt,
  renderPhaseSkewFrames,
} from "../fixtures/phase-skew/render-phase-skew"

test("matched differential pair renders white", async () => {
  const [matched, overridden] = await renderPhaseSkewFrames({
    board: MatchedPairBoard(),
    frameOptions: [
      { showDifferentialPairPhaseSkew: true },
      { phaseSkewColors: { zero: "#00ff00" } },
    ],
  })
  for (const y of [0.6, -0.6]) {
    expect(pixelAt({ frame: matched, x: 0, y })).toEqual([255, 255, 255])
    expect(pixelAt({ frame: overridden, x: 0, y })).toEqual([0, 255, 0])
  }
  await expectPhaseSkewSnapshot({ name: "matched", frame: matched })
}, 30_000)
