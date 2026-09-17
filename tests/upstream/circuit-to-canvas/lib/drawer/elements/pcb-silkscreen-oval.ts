import type { PcbSilkscreenOval } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawOval } from "../shapes/oval"

export interface DrawPcbSilkscreenOvalParams {
  ctx: CanvasContext
  oval: PcbSilkscreenOval
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function layerToSilkscreenColor(layer: string, colorMap: PcbColorMap): string {
  return layer === "bottom"
    ? colorMap.silkscreen.bottom
    : colorMap.silkscreen.top
}

export function drawPcbSilkscreenOval(
  params: DrawPcbSilkscreenOvalParams,
): void {
  const { ctx, oval, realToCanvasMat, colorMap } = params
  const color = layerToSilkscreenColor(oval.layer, colorMap)

  drawOval({
    ctx,
    center: oval.center,
    radius_x: oval.radius_x,
    radius_y: oval.radius_y,
    stroke: color,
    strokeWidth: 0.1,
    realToCanvasMat,
    rotation: oval.ccw_rotation ?? 0,
  })
}
