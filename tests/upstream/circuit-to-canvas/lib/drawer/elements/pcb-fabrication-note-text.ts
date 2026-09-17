import type { PcbFabricationNoteText } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawText } from "../shapes/text"

export interface DrawPcbFabricationNoteTextParams {
  ctx: CanvasContext
  text: PcbFabricationNoteText
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function layerToColor(layer: string, colorMap: PcbColorMap): string {
  // For fabrication notes, we use a default color
  // Could be extended to support per-layer colors in the future
  return colorMap.fabricationNote
}

export function drawPcbFabricationNoteText(
  params: DrawPcbFabricationNoteTextParams,
): void {
  const { ctx, text, realToCanvasMat, colorMap } = params

  const defaultColor = layerToColor(text.layer, colorMap)
  const color = text.color ?? defaultColor
  const fontSize = text.font_size

  // Use @tscircuit/alphabet to draw text
  // Pass real-world coordinates and let drawText apply the realToCanvasMat
  drawText({
    ctx,
    text: text.text,
    x: text.anchor_position.x,
    y: text.anchor_position.y,
    fontSize,
    color,
    realToCanvasMat,
    anchorAlignment: text.anchor_alignment,
  })
}
