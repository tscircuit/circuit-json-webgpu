import type { PcbBoard } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../../types"
import { drawPolygonPath } from "../helper-functions/draw-polygon"

/**
 * Draws the base soldermask layer covering the entire board.
 */
export function drawBoardSoldermask(params: {
  ctx: CanvasContext
  board: PcbBoard
  realToCanvasMat: Matrix
  soldermaskColor: string
}): void {
  const { ctx, board, realToCanvasMat, soldermaskColor } = params
  const { width, height, center, outline } = board

  if (outline && Array.isArray(outline) && outline.length >= 3) {
    // Draw filled polygon for custom outline
    const canvasPoints = outline.map((p) => {
      const [x, y] = applyToPoint(realToCanvasMat, [p.x, p.y])
      return { x, y }
    })

    ctx.beginPath()
    drawPolygonPath({ ctx, points: canvasPoints })
    ctx.fillStyle = soldermaskColor
    ctx.fill()
  } else if (width !== undefined && height !== undefined && center) {
    // Draw filled rectangle
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
}
