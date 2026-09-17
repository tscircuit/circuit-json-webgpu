import type { PcbSilkscreenPath } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawLine } from "../shapes/line"

export interface DrawPcbSilkscreenPathParams {
  ctx: CanvasContext
  path: PcbSilkscreenPath
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function layerToSilkscreenColor(layer: string, colorMap: PcbColorMap): string {
  return layer === "bottom"
    ? colorMap.silkscreen.bottom
    : colorMap.silkscreen.top
}

export function drawPcbSilkscreenPath(
  params: DrawPcbSilkscreenPathParams,
): void {
  const { ctx, path, realToCanvasMat, colorMap } = params

  const color = layerToSilkscreenColor(path.layer, colorMap)

  if (!path.route || path.route.length < 2) return

  // Draw each segment of the path
  for (let i = 0; i < path.route.length - 1; i++) {
    const start = path.route[i]
    const end = path.route[i + 1]

    if (!start || !end) continue

    drawLine({
      ctx,
      start: { x: start.x, y: start.y },
      end: { x: end.x, y: end.y },
      strokeWidth: path.stroke_width ?? 0.1,
      stroke: color,
      realToCanvasMat,
    })
  }
}
