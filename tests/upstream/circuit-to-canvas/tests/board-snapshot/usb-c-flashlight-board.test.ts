import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getStackedPngSvgComparison } from "../fixtures/getStackedPngSvgComparison"
import usbcFlashlightCircuit from "./usb-c-flashlight.json"

const circuitElements = usbcFlashlightCircuit as AnyCircuitElement[]

test("USB-C flashlight - comprehensive comparison (circuit-to-canvas vs circuit-to-svg)", async () => {
  const stackedPng = await getStackedPngSvgComparison(circuitElements, {
    width: 400,
    height: 800,
    drawSoldermask: true,
  })

  await expect(stackedPng).toMatchPngSnapshot(import.meta.path)
})
