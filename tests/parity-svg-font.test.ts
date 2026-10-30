import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { PNG } from "pngjs"
import { renderSvg } from "./parity/render-svg"

test("SVG reference labels use their embedded font without system fonts", async () => {
  const svg = convertCircuitJsonToPcbSvg(
    [
      {
        type: "pcb_note_text",
        pcb_note_text_id: "label",
        text: "White label",
        font: "tscircuit2024",
        font_size: 1,
        anchor_position: { x: 0, y: 0 },
        anchor_alignment: "center",
        color: "white",
        layer: "top",
      },
    ],
    {
      width: 240,
      height: 80,
      viewport: { minX: -6, maxX: 6, minY: -2, maxY: 2 },
      showPcbNotes: true,
      includeVersion: false,
      backgroundColor: "#000000",
    },
  )
  const expected = PNG.sync.read(await renderSvg(svg))
  const missingFont = PNG.sync.read(
    new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng(),
  )
  expect(expected.data).not.toEqual(missingFont.data)
  let whitePixels = 0
  for (let i = 0; i < expected.data.length; i += 4)
    if (expected.data[i] > 200 && expected.data[i + 1] > 200) whitePixels++
  expect(whitePixels).toBeGreaterThan(100)
  expect(await renderSvg(svg)).toEqual(await renderSvg(svg))
  await expect(
    renderSvg('<svg xmlns="http://www.w3.org/2000/svg"/>'),
  ).rejects.toThrow("missing its alphabet font")
})
