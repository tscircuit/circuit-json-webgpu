import assert from "node:assert/strict"
import { PNG } from "pngjs"
import type { Page } from "playwright"
import { createAm3352DdrOdtCircuit } from "./fixtures/am3352-ddr-odt"

export async function checkAm3352SoldermaskPixels(page: Page) {
  const elements = await createAm3352DdrOdtCircuit()
  const result = await page.evaluate(
    (circuitJson) => window.gpuTest.checkAm3352Soldermask(circuitJson),
    elements,
  )
  assert.deepEqual(result.diagnostics, [])
  const pixel = (frame: string, x: number, y: number) => {
    const image = PNG.sync.read(Buffer.from(frame, "base64"))
    return [
      ...image.data.subarray(
        (y * image.width + x) * 4,
        (y * image.width + x) * 4 + 4,
      ),
    ]
  }
  const on = result.frames.maskOn
  const off = result.frames.maskOff
  assert.deepEqual(pixel(on, 400, 400), [18, 82, 50, 255], "covered trace")
  assert.deepEqual(pixel(on, 440, 400), [12, 55, 33, 255], "bare mask")
  assert.deepEqual(pixel(off, 400, 400), [200, 52, 52, 255], "unmasked trace")
  assert.deepEqual(pixel(off, 440, 400), [0, 0, 0, 255], "mask hidden")
  for (const frame of [on, off]) {
    assert.deepEqual(pixel(frame, 414, 196), [200, 52, 52, 255], "pad opening")
    assert.deepEqual(pixel(frame, 398, 131), [0, 0, 0, 255], "via drill")
    assert.deepEqual(pixel(frame, 400, 131), [200, 52, 52, 255], "via opening")
  }
}
