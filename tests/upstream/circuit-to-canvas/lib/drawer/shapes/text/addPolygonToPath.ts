import type { Point } from "circuit-json"
import type { CanvasContext } from "../../types"

export function addPolygonToPath(ctx: CanvasContext, points: Point[]): void {
  if (points.length < 3) return

  const firstPoint = points[0]
  if (!firstPoint) return

  ctx.moveTo(firstPoint.x, firstPoint.y)
  for (let i = 1; i < points.length; i++) {
    const point = points[i]
    if (!point) continue
    ctx.lineTo(point.x, point.y)
  }
  ctx.closePath()
}
