import { expect, test } from "bun:test"
import font from "@tscircuit/alphabet/base64font"
import { PNG } from "pngjs"
import { renderReferenceSvg } from "./parity/render-reference-svg"

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="100">
  <style>@font-face {font-family: 'TscircuitAlphabet'; src: url('data:font/ttf;base64,${font}');}</style>
  <text x="10" y="70" font-size="48" font-family="TscircuitAlphabet" fill="white">ABC123</text>
</svg>`

test("SVG reference labels render with the embedded alphabet and no system fonts", () => {
  const png = renderReferenceSvg(svg)
  const image = PNG.sync.read(png)
  let ink = 0
  for (let i = 3; i < image.data.length; i += 4) if (image.data[i]) ink++
  expect(ink).toBeGreaterThan(100)
  expect(renderReferenceSvg(svg)).toEqual(png)
})

test("missing embedded fonts fail instead of using runner-dependent fallback fonts", () => {
  expect(() =>
    renderReferenceSvg(svg.replace(/<style>.*<\/style>/, "")),
  ).toThrow("SVG reference is missing its embedded font")
})
