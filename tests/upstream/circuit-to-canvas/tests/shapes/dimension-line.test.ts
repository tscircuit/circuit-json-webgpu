import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import { identity } from "transformation-matrix"
import { drawDimensionLine } from "../../lib/drawer/shapes/dimension-line"

test("drawDimensionLine shape", async () => {
  const width = 400
  const height = 200
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext("2d")

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, width, height)

  // Basic horizontal dimension
  drawDimensionLine({
    ctx,
    from: { x: 50, y: 50 },
    to: { x: 350, y: 50 },
    realToCanvasMat: identity(),
    color: "white",
    fontSize: 12,
    arrowSize: 8,
    text: "300mm",
  })

  // Vertical dimension with offset and extension lines
  drawDimensionLine({
    ctx,
    from: { x: 50, y: 80 },
    to: { x: 50, y: 180 },
    realToCanvasMat: identity(),
    color: "cyan",
    fontSize: 10,
    arrowSize: 6,
    text: "100mm",
    offset: {
      distance: 30,
      direction: { x: 1, y: 0 },
    },
  })

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
