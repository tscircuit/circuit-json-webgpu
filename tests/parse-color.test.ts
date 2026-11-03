import { expect, test } from "bun:test"
import { parseColor } from "../lib/colors"

test("parses named CSS colors, casing, whitespace, and transparency", () => {
  for (const [name, hex] of [
    ["white", "#ffffff"],
    ["red", "#ff0000"],
    ["green", "#008000"],
    ["rebeccapurple", "#663399"],
    ["aliceblue", "#f0f8ff"],
    ["darkslategray", "#2f4f4f"],
    ["darkslategrey", "#2f4f4f"],
    ["transparent", "#00000000"],
  ]) {
    expect(parseColor(name)).toEqual(parseColor(hex))
    expect(parseColor(`  ${name.toUpperCase()}\t`)).toEqual(parseColor(hex))
  }
})

test("preserves existing hex and numeric RGB/RGBA parsing", () => {
  for (const [input, expected] of [
    ["#f00", [1, 0, 0, 1]],
    ["#f008", [1, 0, 0, 136 / 255]],
    ["#FF8000", [1, 128 / 255, 0, 1]],
    ["#ff800080", [1, 128 / 255, 0, 128 / 255]],
    ["rgb(255, 128, 0)", [1, 128 / 255, 0, 1]],
    ["rgba(255, 128, 0, 0.25)", [1, 128 / 255, 0, 0.25]],
    ["rgba(1e2, 2e1, 3e0, 5e-1)", [100 / 255, 20 / 255, 3 / 255, 0.5]],
  ] as const) {
    expect(parseColor(input)).toEqual(expected)
  }
})

test("keeps unsupported colors as actionable errors", () => {
  for (const input of [
    "not-a-color",
    "currentColor",
    "inherit",
    "constructor",
    "__proto__",
    "",
    "#12345",
    "rgb(1, 2, nope)",
  ]) {
    expect(() => parseColor(input)).toThrow(`Unsupported color: ${input}`)
  }
})
