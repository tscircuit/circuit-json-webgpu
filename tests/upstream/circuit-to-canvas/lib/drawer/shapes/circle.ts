import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../types"

export interface DrawCircleParams {
  ctx: CanvasContext
  center: { x: number; y: number }
  radius: number
  fill?: string
  realToCanvasMat: Matrix
  stroke?: string
  strokeWidth?: number
  isStrokeDashed?: boolean
}

export function drawCircle(params: DrawCircleParams): void {
  const {
    ctx,
    center,
    radius,
    fill,
    realToCanvasMat,
    stroke,
    strokeWidth,
    isStrokeDashed = false,
  } = params

  const [cx, cy] = applyToPoint(realToCanvasMat, [center.x, center.y])
  const scaledRadius = radius * Math.abs(realToCanvasMat.a)
  const scaledStrokeWidth = strokeWidth
    ? strokeWidth * Math.abs(realToCanvasMat.a)
    : undefined

  ctx.beginPath()
  ctx.arc(cx, cy, scaledRadius, 0, Math.PI * 2)

  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }

  if (stroke && scaledStrokeWidth) {
    // Set up dashed line if needed (after path is drawn, before stroke)
    if (isStrokeDashed) {
      ctx.setLineDash([scaledStrokeWidth * 3, scaledStrokeWidth * 2])
    } else {
      ctx.setLineDash([])
    }
    ctx.strokeStyle = stroke
    ctx.lineWidth = scaledStrokeWidth
    ctx.stroke()
  }
}
