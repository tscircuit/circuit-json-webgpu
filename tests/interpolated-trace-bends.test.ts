import { expect, test } from "bun:test"
import { compileCircuitJson } from "../lib"
import { meshBounds } from "./fixtures/mesh-geometry"
import { interpolatedTrace } from "./fixtures/interpolated-trace"

test("interpolated bends use the averaged normal at the shared vertex", () => {
  const scene = compileCircuitJson([
    {
      ...interpolatedTrace,
      route: [
        interpolatedTrace.route[0],
        { ...interpolatedTrace.route[1], width: 2 },
        { ...interpolatedTrace.route[1], y: 4 },
      ],
    },
  ])
  expect(scene.diagnostics).toEqual([])
  const mesh = scene.layers[0].paint
  const positions = [...mesh.vertices].filter((_, i) => i % 8 < 2)
  // A right-angle turn has a bisector normal (-1, 1) / sqrt(2).
  expect(positions[2]).toBeCloseTo(4 - Math.SQRT1_2)
  expect(positions[3]).toBeCloseTo(Math.SQRT1_2)
  const bounds = meshBounds(mesh)
  for (const [i, expected] of [0, 5.5, -Math.SQRT1_2, 4].entries())
    expect(bounds[i]).toBeCloseTo(expected)
})
