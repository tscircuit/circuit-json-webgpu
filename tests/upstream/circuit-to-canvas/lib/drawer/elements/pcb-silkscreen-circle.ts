import type { PcbSilkscreenCircle } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawCircle } from "../shapes/circle"

export interface DrawPcbSilkscreenCircleParams {
  ctx: CanvasContext
  circle: PcbSilkscreenCircle
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function layerToSilkscreenColor(layer: string, colorMap: PcbColorMap): string {
  return layer === "bottom"
    ? colorMap.silkscreen.bottom
    : colorMap.silkscreen.top
}

export function drawPcbSilkscreenCircle(
  params: DrawPcbSilkscreenCircleParams,
): void {
  const { ctx, circle, realToCanvasMat, colorMap } = params

  const color = layerToSilkscreenColor(circle.layer, colorMap)

  drawCircle({
    ctx,
    center: circle.center,
    radius: circle.radius,
    stroke: color,
    strokeWidth: circle.stroke_width,
    realToCanvasMat,
  })
}
