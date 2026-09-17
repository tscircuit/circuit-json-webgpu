import type { PcbSilkscreenLine } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawLine } from "../shapes/line"

export interface DrawPcbSilkscreenLineParams {
  ctx: CanvasContext
  line: PcbSilkscreenLine
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function layerToSilkscreenColor(layer: string, colorMap: PcbColorMap): string {
  return layer === "bottom"
    ? colorMap.silkscreen.bottom
    : colorMap.silkscreen.top
}

export function drawPcbSilkscreenLine(
  params: DrawPcbSilkscreenLineParams,
): void {
  const { ctx, line, realToCanvasMat, colorMap } = params

  const color = layerToSilkscreenColor(line.layer, colorMap)

  drawLine({
    ctx,
    start: { x: line.x1, y: line.y1 },
    end: { x: line.x2, y: line.y2 },
    strokeWidth: line.stroke_width ?? 0.1,
    stroke: color,
    realToCanvasMat,
  })
}
