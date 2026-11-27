import { expect, test } from "bun:test"
import { SkewScaleBoard } from "../fixtures/phase-skew/example-boards"
import {
  pixelAt,
  renderPhaseSkewFrames,
} from "../fixtures/phase-skew/render-phase-skew"

test.each([
  {
    scale: "1 mm bus limit",
    maxLengthSkew: 1,
    halfLimitX: -9.25,
    limitX: -8.5,
  },
  {
    scale: "2 mm fallback",
    maxLengthSkew: undefined,
    halfLimitX: -8.5,
    limitX: -7,
  },
])(
  "the overlay reaches full color at the $scale",
  async ({ maxLengthSkew, halfLimitX, limitX }) => {
    const [frame] = await renderPhaseSkewFrames({
      board: SkewScaleBoard({ maxLengthSkew }),
      frameOptions: [{ showDifferentialPairPhaseSkew: true }],
    })
    // On the straight leg, skew grows from 0 to -4 mm over 6 mm of copper.
    const pixel = (x: number) => pixelAt({ frame, x, y: -0.6 })
    expect(pixel(-11)).toEqual([255, 255, 255])
    const [r, g, b] = pixel(halfLimitX)
    expect(r).toBe(255)
    expect(g).toBeCloseTo(128, -1)
    expect(b).toBe(g)
    expect(pixel(limitX)).toEqual([255, 0, 0])
    expect(pixel(-5)).toEqual([255, 0, 0])
  },
  30_000,
)

test("a zero bus limit switches immediately between neutral and the configured full color", async () => {
  const [frame] = await renderPhaseSkewFrames({
    board: SkewScaleBoard({ maxLengthSkew: 0 }),
    frameOptions: [
      {
        showDifferentialPairPhaseSkew: true,
        phaseSkewColors: { zero: "yellow", negative: "lime" },
      },
    ],
  })
  const pixel = (x: number) => pixelAt({ frame, x, y: -0.6 })
  expect(pixel(-10.1)).toEqual([255, 255, 0])
  expect(pixel(-9.9)).toEqual([0, 255, 0])
  expect(pixel(-4)).toEqual([0, 255, 0])
}, 30_000)
