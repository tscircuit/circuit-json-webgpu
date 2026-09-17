import type { PcbPanel } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { drawPath } from "../shapes/path"
import { drawRect } from "../shapes/rect"
import type { CanvasContext, PcbColorMap } from "../types"

export interface DrawPcbPanelParams {
  ctx: CanvasContext
  panel: PcbPanel
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
  drawBoardMaterial: boolean
}

export function drawPcbPanelElement(params: DrawPcbPanelParams): void {
  const { ctx, panel, realToCanvasMat, colorMap, drawBoardMaterial } = params
  const { width, height, center } = panel

  // Draw a rectangle
  if (width !== undefined && height !== undefined && center) {
    // Draw substrate fill only if drawBoardMaterial is true
    if (drawBoardMaterial) {
      drawRect({
        ctx,
        center,
        width,
        height,
        fill: colorMap.substrate,
        realToCanvasMat,
      })
    }

    // Always draw the outline stroke separately using path
    const halfWidth = width / 2
    const halfHeight = height / 2
    const corners = [
      { x: center.x - halfWidth, y: center.y - halfHeight },
      { x: center.x + halfWidth, y: center.y - halfHeight },
      { x: center.x + halfWidth, y: center.y + halfHeight },
      { x: center.x - halfWidth, y: center.y + halfHeight },
    ]

    drawPath({
      ctx,
      points: corners,
      stroke: colorMap.boardOutline,
      strokeWidth: 0.5,
      realToCanvasMat,
      closePath: true,
    })
  }
}

export function drawPcbPanelSoldermask(params: {
  ctx: CanvasContext
  panel: PcbPanel
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
  layer: "top" | "bottom"
}): void {
  const { ctx, panel, realToCanvasMat, colorMap, layer } = params
  const { width, height, center } = panel
  if (width === undefined || height === undefined || !center) return

  drawRect({
    ctx,
    center,
    width,
    height,
    fill: colorMap.soldermask[layer],
    realToCanvasMat,
  })
}
