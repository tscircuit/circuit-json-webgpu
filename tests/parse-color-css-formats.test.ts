import { expect, test } from "bun:test"
import { parseColor } from "../lib/colors"
import type { Color } from "../lib/types"

test("normalizes HSL and percentage RGB colors", () => {
  const cases: [string, Color][] = [
    ["hsl(120, 100%, 50%)", [0, 1, 0, 1]],
    ["hsla(240, 100%, 50%, 0.5)", [0, 0, 1, 0.5]],
    ["rgb(100%, 0%, 0%)", [1, 0, 0, 1]],
  ]
  for (const [value, expected] of cases) {
    expect(parseColor(value)).toEqual(expected)
  }
})
