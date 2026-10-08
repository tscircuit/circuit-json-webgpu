import { expect, test } from "bun:test"
import { parseColor } from "../lib/colors"
import type { Color } from "../lib/types"

test.each<[string, Color]>([
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
])("parses CSS named color %s", (value, expected) => {
  expect(parseColor(value)).toEqual(expected)
})

test.each<[string, Color]>([
  ["#f00", [1, 0, 0, 1]],
  ["#f008", [1, 0, 0, 136 / 255]],
  ["#FF0000", [1, 0, 0, 1]],
  ["#ff000080", [1, 0, 0, 128 / 255]],
  ["rgb(255, 0, 0)", [1, 0, 0, 1]],
  ["rgba(255, 0, 0, 0.5)", [1, 0, 0, 0.5]],
])("preserves existing color format %s", (value, expected) => {
  expect(parseColor(value)).toEqual(expected)
})

test.each([
  "not-a-color",
  "",
  "#12345",
  "rgb(x, 0, 0)",
  "constructor",
  "__proto__",
])("rejects unsupported color %s", (value) => {
  expect(() => parseColor(value)).toThrow(`Unsupported color: ${value}`)
})
