import type { PcbVia, PcbViaInput } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../../types"
import { cutPathFromSoldermask } from "./cut-path-from-soldermask"

/**
 * Process soldermask for a via.
 * Vias typically have soldermask openings to expose the copper ring.
 */
export function processViaSoldermask(params: {
  ctx: CanvasContext
  via: PcbVia
  realToCanvasMat: Matrix
  layer: "top" | "bottom"
  soldermaskOverCopperColor: string
}): void {
  const { ctx, via, realToCanvasMat, layer, soldermaskOverCopperColor } = params
  if (!via.layers.includes(layer)) return

  let board = ctx.boardOwnerMap?.get(via.pcb_via_id)
  if (!ctx.boardOwnerMap?.has(via.pcb_via_id) && via.pcb_trace_id) {
    board = ctx.boardOwnerMap?.get(via.pcb_trace_id)
  }

  const tenting: PcbViaInput = via
  const viaTenting =
    layer === "top" ? tenting.tented_on_top : tenting.tented_on_bottom
  const boardDefaultTenting =
    layer === "top"
      ? board?.default_via_tented_on_top
      : board?.default_via_tented_on_bottom
  const isTented = viaTenting ?? tenting.is_tented ?? boardDefaultTenting

  // Vias typically have soldermask openings to expose the copper ring.
  const [cx, cy] = applyToPoint(realToCanvasMat, [via.x, via.y])
  const scaledRadius = (via.outer_diameter / 2) * Math.abs(realToCanvasMat.a)

  ctx.beginPath()
  ctx.arc(cx, cy, scaledRadius, 0, Math.PI * 2)
  ctx.closePath()
  if (isTented) {
    // Restore mask over the entire via, including drill cutouts from traces.
    ctx.fillStyle = soldermaskOverCopperColor
    ctx.fill()
  } else {
    cutPathFromSoldermask(ctx)
  }
}
