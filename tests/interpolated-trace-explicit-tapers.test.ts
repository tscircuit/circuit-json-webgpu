import { expect, test } from "bun:test"
import { compileCircuitJson } from "../lib"
import type { TaperedWirePoint } from "../lib/get-wire-taper-polygon"
import { area } from "./fixtures/mesh-geometry"
import { interpolatedTrace } from "./fixtures/interpolated-trace"

test("explicit outgoing tapers split interpolation without duplicate copper", () => {
  const taper: TaperedWirePoint = {
    ...interpolatedTrace.route[1],
    width: 1,
    start_width: 1,
    end_width: 3,
    width_interpolation_mode: "linear",
  }
  const scene = compileCircuitJson([
    {
      ...interpolatedTrace,
      route: [
        interpolatedTrace.route[0],
        taper,
        { ...interpolatedTrace.route[1], x: 8 },
        { ...interpolatedTrace.route[0], x: 12 },
      ],
    },
  ])
  expect(scene.diagnostics).toEqual([])
  expect(scene.triangleCount).toBe(6)
  expect(area(scene.layers[0].paint)).toBeCloseTo(20)
})
