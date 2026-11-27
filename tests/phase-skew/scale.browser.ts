import { expect, test } from "bun:test"
import { SkewScaleBoard } from "../fixtures/phase-skew/example-boards"
import {
  pixelAt,
  renderPhaseSkewFrames,
} from "../fixtures/phase-skew/render-phase-skew"

test("changing the fallback or per-pair scale recolors the retained circuit", async () => {
  const [two, mapped, restored, one, zero] = await renderPhaseSkewFrames({
    board: SkewScaleBoard(),
    frameOptions: (elements) => {
      const pair = elements.find(
        (e) => e.type === "pcb_differential_pair_phase_skew",
      )!
      return [
        { showDifferentialPairPhaseSkew: true, phaseSkewFullScaleMm: 2 },
        { phaseSkewFullScaleMmBySourceBusId: { [pair.source_bus_id]: 1 } },
        { phaseSkewFullScaleMmBySourceBusId: {} },
        { phaseSkewFullScaleMm: 1 },
        {
          phaseSkewFullScaleMmBySourceBusId: { [pair.source_bus_id]: 0 },
          phaseSkewColors: { zero: "yellow", negative: "lime" },
        },
      ]
    },
  })
  expect(restored.data.equals(two.data)).toBe(true)
  expect(mapped.data.equals(one.data)).toBe(true)
  // On the straight leg, skew grows from 0 to -4 mm over 6 mm of copper.
  for (const [frame, halfLimitX, limitX] of [
    [two, -8.5, -7],
    [one, -9.25, -8.5],
  ] as const) {
    const pixel = (x: number) => pixelAt({ frame, x, y: -0.6 })
    expect(pixel(-11)).toEqual([255, 255, 255])
    const [r, g, b] = pixel(halfLimitX)
    expect(r).toBe(255)
    expect(g).toBeCloseTo(128, -1)
    expect(b).toBe(g)
    expect(pixel(limitX)).toEqual([255, 0, 0])
    expect(pixel(-5)).toEqual([255, 0, 0])
  }
  expect(pixelAt({ frame: zero, x: -10.1, y: -0.6 })).toEqual([255, 255, 0])
  expect(pixelAt({ frame: zero, x: -9.9, y: -0.6 })).toEqual([0, 255, 0])
  expect(pixelAt({ frame: zero, x: -4, y: -0.6 })).toEqual([0, 255, 0])
}, 30_000)
