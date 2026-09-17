import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbCutout, PcbSmtPad } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("cutout removes overlapping SMT pad copper", async () => {
  const scale = 4
  const canvas = createCanvas(100 * scale, 100 * scale)
  const ctx = canvas.getContext("2d")
  ctx.scale(scale, scale)
  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.configure({
    colorOverrides: { drill: "rgba(0,0,0,0)" },
  })

  const pad: PcbSmtPad = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad1",
    shape: "rect",
    layer: "top",
    x: 50,
    y: 50,
    width: 40,
    height: 20,
  }
  const cutout: PcbCutout = {
    type: "pcb_cutout",
    pcb_cutout_id: "cutout1",
    shape: "circle",
    center: { x: 50, y: 50 },
    radius: 5,
  }

  drawer.drawElements([pad, cutout])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
