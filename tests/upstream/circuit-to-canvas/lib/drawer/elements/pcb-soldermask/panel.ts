import type { PcbPanel } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../../types"

export function drawPanelSoldermask(params: {
  ctx: CanvasContext
  panel: PcbPanel
  realToCanvasMat: Matrix
  soldermaskColor: string
}): void {
  const { ctx, panel, realToCanvasMat, soldermaskColor } = params
  const { width, height, center } = panel
  if (width === undefined || height === undefined || !center) return

  const [cx, cy] = applyToPoint(realToCanvasMat, [center.x, center.y])
  const scaledWidth = width * Math.abs(realToCanvasMat.a)
  const scaledHeight = height * Math.abs(realToCanvasMat.a)

  ctx.fillStyle = soldermaskColor
  ctx.fillRect(
    cx - scaledWidth / 2,
    cy - scaledHeight / 2,
    scaledWidth,
    scaledHeight,
  )
}
