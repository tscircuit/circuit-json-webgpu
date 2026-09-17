import type { PcbNoteDimension } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawDimensionLine } from "../shapes/dimension-line"

export interface DrawPcbNoteDimensionParams {
  ctx: CanvasContext
  pcbNoteDimension: PcbNoteDimension
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

const DEFAULT_NOTE_COLOR = "rgba(255,255,255,0.5)"

export function drawPcbNoteDimension(params: DrawPcbNoteDimensionParams): void {
  const { ctx, pcbNoteDimension, realToCanvasMat } = params

  const color = pcbNoteDimension.color ?? DEFAULT_NOTE_COLOR

  drawDimensionLine({
    ctx,
    from: pcbNoteDimension.from,
    to: pcbNoteDimension.to,
    realToCanvasMat,
    color,
    fontSize: pcbNoteDimension.font_size,
    arrowSize: pcbNoteDimension.arrow_size,
    text: pcbNoteDimension.text,
    textRotation: pcbNoteDimension.text_ccw_rotation,
    offset:
      pcbNoteDimension.offset_distance && pcbNoteDimension.offset_direction
        ? {
            distance: pcbNoteDimension.offset_distance,
            direction: pcbNoteDimension.offset_direction,
          }
        : undefined,
  })
}
