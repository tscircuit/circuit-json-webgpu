import { expect, test } from "bun:test"
import { PNG } from "pngjs"
import { compare } from "./parity/compare.mjs"
function image(rects) {
  const p = new PNG({ width: 100, height: 100 })
  for (let i = 0; i < p.data.length; i += 4) p.data.set([26, 26, 26, 255], i)
  for (const [x, y, w, h, color = 240] of rects)
    for (let a = y; a < y + h; a++)
      for (let b = x; b < x + w; b++)
        p.data.set([color, color, color, 255], (a * 100 + b) * 4)
  return p
}
const label = [
  [25, 45, 3, 12],
  [35, 45, 3, 12],
  [45, 45, 3, 8],
  [45, 55, 3, 2],
]
const expected = image(label)
const changed = (rects) =>
  compare(expected, image(rects), new PNG({ width: 100, height: 100 })).changed
// At this size the ink-relative allowance is four pixels. These regressions
// must fail even after cross-backend antialias filtering.
test("parity comparison rejects missing labels and punctuation", () => {
  expect(changed([])).toBeGreaterThan(4)
  expect(changed(label.slice(0, 3))).toBeGreaterThan(4)
  expect(changed(label.slice(0, 2).concat([label[3]]))).toBeGreaterThan(4)
})
test("parity comparison rejects shifted, compressed, and incorrectly colored ink", () => {
  expect(
    changed(label.map(([x, y, w, h]) => [x + 3, y, w, h])),
  ).toBeGreaterThan(4)
  expect(
    changed(
      label.map(([x, y, w, h]) => [Math.round(25 + (x - 25) * 0.7), y, w, h]),
    ),
  ).toBeGreaterThan(4)
  expect(changed(label.map((r) => [...r, 120]))).toBeGreaterThan(4)
})
