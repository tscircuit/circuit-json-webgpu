import { expect, test } from "bun:test"
import { compileCircuitJson } from "../lib"
import { interpolatedTrace } from "./fixtures/interpolated-trace"

test("invalid interpolated widths retain a diagnostic and never emit nonfinite geometry", () => {
  for (const width of [NaN, Infinity, -1]) {
    const scene = compileCircuitJson([
      {
        ...interpolatedTrace,
        route: [
          interpolatedTrace.route[0],
          { ...interpolatedTrace.route[1], width },
        ],
      },
    ])
    expect(scene.diagnostics).toHaveLength(1)
    expect(scene.triangleCount).toBe(0)
  }
})
