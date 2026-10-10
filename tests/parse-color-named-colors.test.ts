import { expect, test } from "bun:test"
import { parseColor } from "../lib/colors"
import type { Color } from "../lib/types"

test("parses CSS named colors and transparency", () => {
  const cases: [string, Color][] = [
    ["white", [1, 1, 1, 1]],
    ["black", [0, 0, 0, 1]],
    ["red", [1, 0, 0, 1]],
    ["lime", [0, 1, 0, 1]],
    ["blue", [0, 0, 1, 1]],
    ["rebeccapurple", [102 / 255, 51 / 255, 153 / 255, 1]],
    ["darkslategrey", [47 / 255, 79 / 255, 79 / 255, 1]],
    [" WhItE ", [1, 1, 1, 1]],
    ["transparent", [0, 0, 0, 0]],
    [" TRANSPARENT ", [0, 0, 0, 0]],
  ]
  for (const [value, expected] of cases) {
    expect(parseColor(value)).toEqual(expected)
  }
})
