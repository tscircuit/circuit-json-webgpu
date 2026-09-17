import type { PcbSilkscreenText } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawText, type AnchorAlignment } from "../shapes/text"

export interface DrawPcbSilkscreenTextParams {
  ctx: CanvasContext
  text: PcbSilkscreenText
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function layerToSilkscreenColor(layer: string, colorMap: PcbColorMap): string {
  return layer === "bottom"
    ? colorMap.silkscreen.bottom
    : colorMap.silkscreen.top
}

function mapAnchorAlignment(alignment?: string): AnchorAlignment {
  if (!alignment) return "center"
  return alignment as AnchorAlignment
}

export function drawPcbSilkscreenText(
  params: DrawPcbSilkscreenTextParams,
): void {
  const { ctx, text, realToCanvasMat, colorMap } = params

  const content = text.text ?? ""
  if (!content) return

  const color = layerToSilkscreenColor(text.layer, colorMap)
  const alignment = mapAnchorAlignment(text.anchor_alignment)
  const fontSize = text.font_size ?? 1

  drawText({
    ctx,
    text: content,
    x: text.anchor_position.x,
    y: text.anchor_position.y,
    fontSize,
    color,
    realToCanvasMat,
    anchorAlignment: alignment,
    rotation: text.ccw_rotation ?? 0,
    mirrorX: text.layer === "bottom",
    knockout: text.is_knockout,
    knockoutPadding: text.is_knockout ? text.knockout_padding : undefined,
  })
}
