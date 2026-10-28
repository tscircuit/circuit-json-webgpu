import type { PNG } from "pngjs"
import pixelmatch from "pixelmatch"
// Compare geometry/colors after a one-pixel-sigma antialiasing filter. Canvas uses
// analytic coverage while WebGPU uses MSAA; their raw edge samples differ.
// Keep the unfiltered diff in the report as well; never approve new goldens.
export function filtered(image: PNG) {
  const { width, height, data } = image,
    out = new Uint8Array(data.length)
  const horizontal = new Uint16Array(data.length)
  const weights = [1, 4, 6, 4, 1]
  // The binomial kernel is separable. Keep the intermediate sums unrounded so
  // two five-tap passes produce exactly the original 25-tap result.
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      for (let c = 0; c < 4; c++) {
        let sum = 0
        for (let dx = -2; dx <= 2; dx++)
          sum +=
            data[
              (y * width + Math.max(0, Math.min(width - 1, x + dx))) * 4 + c
            ] * weights[dx + 2]
        horizontal[(y * width + x) * 4 + c] = sum
      }
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      for (let c = 0; c < 4; c++) {
        let sum = 0
        for (let dy = -2; dy <= 2; dy++)
          sum +=
            horizontal[
              (Math.max(0, Math.min(height - 1, y + dy)) * width + x) * 4 + c
            ] * weights[dy + 2]
        out[(y * width + x) * 4 + c] = Math.round(sum / 256)
      }
  return out
}
export function compare(expected: PNG, actual: PNG, diff: PNG) {
  const rawChanged = pixelmatch(
    expected.data,
    actual.data,
    diff.data,
    actual.width,
    actual.height,
    { threshold: 0.1 },
  )
  // The final minimum is already zero; filtering cannot change this result.
  if (rawChanged === 0) return { rawChanged, changed: 0 }
  const changed = pixelmatch(
    filtered(expected),
    filtered(actual),
    undefined,
    actual.width,
    actual.height,
    { threshold: 0.1, includeAA: true },
  )
  return { rawChanged, changed: Math.min(rawChanged, changed) }
}
