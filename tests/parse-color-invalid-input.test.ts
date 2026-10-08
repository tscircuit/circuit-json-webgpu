import { expect, test } from "bun:test"
import { parseColor } from "../lib/colors"

test("rejects unsupported colors with the original diagnostic", () => {
  for (const value of [
    "not-a-color",
    "",
    "#12345",
    "rgb(x, 0, 0)",
    "constructor",
    "__proto__",
  ]) {
    expect(() => parseColor(value)).toThrow(`Unsupported color: ${value}`)
  }
})
