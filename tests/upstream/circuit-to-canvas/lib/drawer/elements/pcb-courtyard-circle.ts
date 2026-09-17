import type { PcbCourtyardCircle } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawCircle } from "../shapes/circle"

export interface DrawPcbCourtyardCircleParams {
  ctx: CanvasContext
  circle: PcbCourtyardCircle
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function layerToCourtyardColor(layer: string, colorMap: PcbColorMap): string {
  return layer === "bottom" ? colorMap.courtyard.bottom : colorMap.courtyard.top
}

export function drawPcbCourtyardCircle(
  params: DrawPcbCourtyardCircleParams,
): void {
  const { ctx, circle, realToCanvasMat, colorMap } = params

  drawCircle({
    ctx,
    center: circle.center,
    radius: circle.radius,
    stroke: layerToCourtyardColor(circle.layer, colorMap),
    strokeWidth: 0.05, // Default thin line for courtyard info
    realToCanvasMat,
  })
}
