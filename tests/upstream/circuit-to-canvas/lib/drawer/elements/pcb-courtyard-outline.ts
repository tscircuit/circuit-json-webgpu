import type { PcbCourtyardOutline } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { applyToPoint } from "transformation-matrix"

export interface DrawPcbCourtyardOutlineParams {
  ctx: CanvasContext
  outline: PcbCourtyardOutline
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function layerToCourtyardColor(layer: string, colorMap: PcbColorMap): string {
  return layer === "bottom" ? colorMap.courtyard.bottom : colorMap.courtyard.top
}

export function drawPcbCourtyardOutline(
  params: DrawPcbCourtyardOutlineParams,
): void {
  const { ctx, outline, realToCanvasMat, colorMap } = params

  if (!outline.outline || outline.outline.length < 2) return

  ctx.beginPath()
  const startPoint = applyToPoint(
    realToCanvasMat,
    outline.outline[0] as { x: number; y: number },
  ) as { x: number; y: number }
  ctx.moveTo(startPoint.x, startPoint.y)

  for (let i = 1; i < outline.outline.length; i++) {
    const point = applyToPoint(
      realToCanvasMat,
      outline.outline[i] as { x: number; y: number },
    ) as { x: number; y: number }
    ctx.lineTo(point.x, point.y)
  }

  ctx.closePath()
  ctx.lineWidth = 0.05 * Math.abs(realToCanvasMat.a) // Scale line width
  ctx.strokeStyle = layerToCourtyardColor(outline.layer, colorMap)
  ctx.lineJoin = "round"
  ctx.stroke()
}
