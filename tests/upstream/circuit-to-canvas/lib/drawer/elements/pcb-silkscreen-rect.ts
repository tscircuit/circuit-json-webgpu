import type { PcbSilkscreenRect } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawRect } from "../shapes/rect"

export interface DrawPcbSilkscreenRectParams {
  ctx: CanvasContext
  rect: PcbSilkscreenRect
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function layerToSilkscreenColor(layer: string, colorMap: PcbColorMap): string {
  return layer === "bottom"
    ? colorMap.silkscreen.bottom
    : colorMap.silkscreen.top
}

export function drawPcbSilkscreenRect(
  params: DrawPcbSilkscreenRectParams,
): void {
  const { ctx, rect, realToCanvasMat, colorMap } = params

  const color = layerToSilkscreenColor(rect.layer, colorMap)

  drawRect({
    ctx,
    center: rect.center,
    width: rect.width,
    height: rect.height,
    borderRadius: rect.corner_radius,
    fill: rect.is_filled ? color : "transparent",
    stroke: color,
    strokeWidth: rect.stroke_width,
    realToCanvasMat,
  })
}
