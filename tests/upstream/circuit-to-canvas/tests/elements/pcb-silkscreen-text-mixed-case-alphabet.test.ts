import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbSilkscreenText } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw silkscreen mixed-case alphabet pairs", async () => {
  const SCALE = 4
  const canvas = createCanvas(1100 * SCALE, 140 * SCALE)
  const ctx = canvas.getContext("2d")
  ctx.scale(SCALE, SCALE)
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, canvas.width / SCALE, canvas.height / SCALE)

  const text: PcbSilkscreenText = {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "silkscreen-mixed-case-alphabet",
    pcb_component_id: "component1",
    layer: "top",
    text: "Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz",
    anchor_position: { x: 550, y: 70 },
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 8,
  }

  drawer.drawElements([text])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
