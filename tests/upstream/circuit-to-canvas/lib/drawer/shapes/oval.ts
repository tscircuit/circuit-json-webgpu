import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../types"

export interface DrawOvalParams {
  ctx: CanvasContext
  center: { x: number; y: number }
  radius_x: number
  radius_y: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  realToCanvasMat: Matrix
  rotation?: number
}

export function drawOval(params: DrawOvalParams): void {
  const {
    ctx,
    center,
    radius_x,
    radius_y,
    fill,
    stroke,
    strokeWidth = 0.1,
    realToCanvasMat,
    rotation = 0,
  } = params

  const [cx, cy] = applyToPoint(realToCanvasMat, [center.x, center.y])
  const scaledRadiusX = radius_x * Math.abs(realToCanvasMat.a)
  const scaledRadiusY = radius_y * Math.abs(realToCanvasMat.a)
  const scaledStrokeWidth = strokeWidth * Math.abs(realToCanvasMat.a)

  ctx.save()
  ctx.translate(cx, cy)

  if (rotation !== 0) {
    ctx.rotate(-rotation * (Math.PI / 180))
  }

  ctx.beginPath()
  ctx.ellipse(0, 0, scaledRadiusX, scaledRadiusY, 0, 0, Math.PI * 2)

  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }

  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = scaledStrokeWidth
    ctx.stroke()
  }

  ctx.restore()
}
