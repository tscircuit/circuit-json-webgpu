import type { PcbSilkscreenPill } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawPill } from "../shapes/pill"

export interface DrawPcbSilkscreenPillParams {
  ctx: CanvasContext
  pill: PcbSilkscreenPill
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function layerToSilkscreenColor(layer: string, colorMap: PcbColorMap): string {
  return layer === "bottom"
    ? colorMap.silkscreen.bottom
    : colorMap.silkscreen.top
}

export function drawPcbSilkscreenPill(
  params: DrawPcbSilkscreenPillParams,
): void {
  const { ctx, pill, realToCanvasMat, colorMap } = params

  const color = layerToSilkscreenColor(pill.layer, colorMap)
  const strokeWidth = 0.2

  // Draw as boundary/outline, not filled
  drawPill({
    ctx,
    center: pill.center,
    width: pill.width,
    height: pill.height,
    stroke: color,
    strokeWidth,
    realToCanvasMat,
  })
}
