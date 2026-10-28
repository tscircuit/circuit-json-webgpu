import { expect, test } from "bun:test"
import { PNG } from "pngjs"
import { filtered } from "./parity/compare"

test("separable comparison filter matches the full 2D kernel byte-for-byte", () => {
  let seed = 42
  for (const [width, height] of [
    [1, 1],
    [1, 9],
    [9, 1],
    [2, 3],
    [17, 13],
  ]) {
    const image = new PNG({ width, height })
    for (let i = 0; i < image.data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      image.data[i] = seed >>> 24
    }
    const expected = new Uint8Array(image.data.length)
    const kernel = [
      [1, 4, 6, 4, 1],
      [4, 16, 24, 16, 4],
      [6, 24, 36, 24, 6],
      [4, 16, 24, 16, 4],
      [1, 4, 6, 4, 1],
    ]
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        for (let channel = 0; channel < 4; channel++) {
          let sum = 0
          for (let ky = 0; ky < 5; ky++)
            for (let kx = 0; kx < 5; kx++) {
              const sx = Math.max(0, Math.min(width - 1, x + kx - 2))
              const sy = Math.max(0, Math.min(height - 1, y + ky - 2))
              sum +=
                image.data[(sy * width + sx) * 4 + channel] * kernel[ky][kx]
            }
          expected[(y * width + x) * 4 + channel] = Math.round(sum / 256)
        }
    expect(filtered(image)).toEqual(expected)
  }
})
