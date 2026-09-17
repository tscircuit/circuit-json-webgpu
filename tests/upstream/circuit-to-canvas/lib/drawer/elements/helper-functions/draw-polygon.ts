import type { CanvasContext } from "../../types"

/**
 * Draws a polygon path from an array of points.
 * The path is not filled or stroked - call ctx.fill() or ctx.stroke() after.
 */
export function drawPolygonPath(params: {
  ctx: CanvasContext
  points: Array<{ x: number; y: number }>
}): void {
  const { ctx, points } = params
  if (points.length < 3) return

  const firstPoint = points[0]
  if (firstPoint) {
    ctx.moveTo(firstPoint.x, firstPoint.y)
    for (let i = 1; i < points.length; i++) {
      const point = points[i]
      if (point) {
        ctx.lineTo(point.x, point.y)
      }
    }
    ctx.closePath()
  }
}
