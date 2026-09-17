import type { NinePointAnchor, PcbCopperText } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { drawText } from "../shapes/text"
import type { CanvasContext, PcbColorMap } from "../types"

export interface DrawPcbCopperTextParams {
  ctx: CanvasContext
  text: PcbCopperText
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function mapAnchorAlignment(alignment?: string): NinePointAnchor {
  if (!alignment) return "center"
  return alignment as NinePointAnchor
}

export function drawPcbCopperText(params: DrawPcbCopperTextParams): void {
  const { ctx, text, realToCanvasMat, colorMap } = params

  const content = text.text ?? ""
  if (!content) return

  drawText({
    ctx,
    text: content,
    x: text.anchor_position.x,
    y: text.anchor_position.y,
    fontSize: text.font_size ?? 1,
    color:
      colorMap.copper[text.layer as keyof typeof colorMap.copper] ??
      colorMap.copper.top,
    realToCanvasMat,
    anchorAlignment: mapAnchorAlignment(text.anchor_alignment),
    rotation: text.ccw_rotation ?? 0,
    mirrorX: text.is_mirrored ?? text.layer === "bottom",
    knockout: text.is_knockout,
    knockoutPadding: text.is_knockout ? text.knockout_padding : undefined,
  })
}
