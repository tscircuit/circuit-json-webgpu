import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import { applyToPoint } from "transformation-matrix"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import {
  boardViaTentingCircuit,
  boardViaTentingViewLabel,
} from "./pcb-via-board-tenting.fixture"

test("panel vias inherit their own board defaults and preserve explicit overrides", async () => {
  function render(layer: "top" | "bottom") {
    const canvas = createCanvas(1440, 540)
    const ctx = canvas.getContext("2d")
    const drawer = new CircuitToCanvasDrawer(ctx)
    drawer.setCameraBounds({ minX: -114, maxX: 114, minY: -43, maxY: 43 })
    const circuit = [
      ...boardViaTentingCircuit,
      {
        ...boardViaTentingViewLabel,
        text: `${layer.toUpperCase()} VIEW - soldermask ON`,
      },
    ]
    const original = structuredClone(circuit)
    drawer.drawElements(circuit, {
      layers:
        layer === "top"
          ? ["top_copper", "top_user_note"]
          : ["bottom_copper", "top_user_note"],
      drawSoldermask: true,
      drawSoldermaskTop: layer === "top",
      drawSoldermaskBottom: layer === "bottom",
    })
    expect(circuit).toEqual(original)
    return {
      canvas,
      pixel(x: number, y: number) {
        const [cx, cy] = applyToPoint(drawer.realToCanvasMat, [x, y])
        return Array.from(
          ctx.getImageData(Math.round(cx), Math.round(cy), 1, 1).data,
        )
      },
    }
  }

  const top = render("top")
  const bottom = render("bottom")
  const tented = [52, 135, 73, 255]
  const exposed = [255, 38, 226, 255]
  expect(top.pixel(-96, 5)).toEqual(tented)
  expect(top.pixel(18, 5)).toEqual(exposed)
  expect(bottom.pixel(-96, 5)).toEqual(exposed)
  expect(bottom.pixel(18, 5)).toEqual(tented)
  expect(top.pixel(-96, -24)).toEqual(tented)
  expect(top.pixel(18, -24)).toEqual(exposed)
  expect(bottom.pixel(-96, -24)).toEqual(exposed)
  expect(bottom.pixel(18, -24)).toEqual(tented)
  expect(top.pixel(-70, 5)).toEqual(exposed)
  expect(bottom.pixel(70, -24)).toEqual(tented)
  expect(top.pixel(-18, -24)).toEqual(exposed)
  expect(bottom.pixel(96, -24)).toEqual(exposed)
  expect(top.pixel(96, 5)).toEqual(exposed)
  expect(bottom.pixel(96, 5)).toEqual(tented)

  const snapshot = createCanvas(1440, 1080)
  snapshot.getContext("2d").drawImage(top.canvas, 0, 0)
  snapshot.getContext("2d").drawImage(bottom.canvas, 0, 540)
  await expect(snapshot.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
