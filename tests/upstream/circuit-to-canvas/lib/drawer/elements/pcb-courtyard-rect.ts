import type { PcbCourtyardRect } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawRect } from "../shapes/rect"

export interface DrawPcbCourtyardRectParams {
  ctx: CanvasContext
  rect: PcbCourtyardRect
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function layerToCourtyardColor(layer: string, colorMap: PcbColorMap): string {
  return layer === "bottom" ? colorMap.courtyard.bottom : colorMap.courtyard.top
}

export function drawPcbCourtyardRect(params: DrawPcbCourtyardRectParams): void {
  const { ctx, rect, realToCanvasMat, colorMap } = params

  drawRect({
    ctx,
    center: rect.center,
    width: rect.width,
    height: rect.height,
    stroke: layerToCourtyardColor(rect.layer, colorMap),
    strokeWidth: 0.05, // Default thin line for courtyard info
    realToCanvasMat,
    ccwRotationDegrees: rect.ccw_rotation ?? 0,
    lineJoin: "round",
  })
}
