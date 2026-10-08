import { expect, test } from "bun:test"
import { parseColor } from "../lib/colors"
import type { Color } from "../lib/types"

test("preserves hex and RGB color formats", () => {
  const cases: [string, Color][] = [
    ["#f00", [1, 0, 0, 1]],
    ["#f008", [1, 0, 0, 136 / 255]],
    ["#FF0000", [1, 0, 0, 1]],
    ["#ff000080", [1, 0, 0, 128 / 255]],
    ["rgb(255, 0, 0)", [1, 0, 0, 1]],
    ["rgba(255, 0, 0, 0.5)", [1, 0, 0, 0.5]],
  ]
  for (const [value, expected] of cases) {
    expect(parseColor(value)).toEqual(expected)
  }
})
