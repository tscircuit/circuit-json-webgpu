import { expect, test } from "bun:test"
import { TuningBumpBoard } from "../fixtures/phase-skew/example-boards"
import {
  expectPhaseSkewSnapshot,
  pixelAt,
  renderPhaseSkewFrames,
} from "../fixtures/phase-skew/render-phase-skew"

test("the opt-in overlay shows a tuning bump and its gradient", async () => {
  const [off, on, disabled] = await renderPhaseSkewFrames({
    board: TuningBumpBoard(),
    frameOptions: [
      {},
      { showDifferentialPairPhaseSkew: true },
      { showDifferentialPairPhaseSkew: false },
    ],
  })
  expect(pixelAt({ frame: off, x: 0, y: 0.6 })).toEqual([200, 52, 52])
  expect(pixelAt({ frame: on, x: 0, y: 0.6 })).toEqual([23, 23, 255])
  expect(pixelAt({ frame: on, x: 0, y: -0.6 })).toEqual([255, 23, 23])
  expect(pixelAt({ frame: on, x: -11, y: -0.6 })).toEqual([255, 255, 255])
  const [red, green, blue] = pixelAt({ frame: on, x: -7.4, y: -0.6 })
  expect(red).toBe(255)
  expect(blue).toBe(green)
  expect(green).toBeCloseTo(139, -1)
  expect(disabled.data.equals(off.data)).toBe(true)
  await expectPhaseSkewSnapshot({ name: "tuning-bump-off", frame: off })
  await expectPhaseSkewSnapshot({ name: "tuning-bump-on", frame: on })
}, 30_000)
