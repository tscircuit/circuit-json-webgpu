import type { CanvasContext } from "../types"

export interface DrawArrowParams {
  ctx: CanvasContext
  x: number
  y: number
  angle: number
  arrowSize: number
  color: string
  strokeWidth: number
}

/**
 * Draw an arrow at a point along a line
 */
export function drawArrow(params: DrawArrowParams): void {
  const { ctx, x, y, angle, arrowSize, color, strokeWidth } = params

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)

  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-arrowSize, -arrowSize / 2)
  ctx.lineTo(-arrowSize, arrowSize / 2)
  ctx.closePath()

  ctx.fillStyle = color
  ctx.fill()

  ctx.restore()
}
