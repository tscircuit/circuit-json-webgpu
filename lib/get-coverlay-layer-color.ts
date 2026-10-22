import type { PcbBoard } from "circuit-json"
import { parseColor } from "./colors"
import type { Color } from "./types"

const COVERLAY_COLORS = {
  yellow: "#cc9c33",
  black: "#111111",
  white: "#ffffff",
}

export function getCoverlayLayerColor(
  board: PcbBoard,
  layer: string,
): Color | undefined {
  if (board.material !== "flex" || board.coverlay_color === undefined)
    return undefined
  if (layer === "board") return parseColor(COVERLAY_COLORS.yellow)
  if (layer === "soldermask_top" || layer === "soldermask_bottom") {
    return parseColor(COVERLAY_COLORS[board.coverlay_color])
  }
  return undefined
}
