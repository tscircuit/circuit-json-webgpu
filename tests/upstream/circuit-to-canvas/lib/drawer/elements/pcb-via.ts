import type { LayerRef, PCBVia } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { drawCircle } from "../shapes/circle"
import type { CanvasContext, PcbColorMap } from "../types"

export interface DrawPcbViaParams {
  ctx: CanvasContext
  via: PCBVia
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
  layer?: LayerRef
}

export function drawPcbVia(params: DrawPcbViaParams): void {
  const { ctx, via, realToCanvasMat, colorMap, layer } = params

  // Draw outer copper ring
  drawCircle({
    ctx,
    center: { x: via.x, y: via.y },
    radius: via.outer_diameter / 2,
    fill: colorMap.copper[layer ?? "top"],
    realToCanvasMat,
  })

  // Cut inner drill hole out of copper, then paint drill color.
  ctx.save()
  ctx.globalCompositeOperation = "destination-out"
  drawCircle({
    ctx,
    center: { x: via.x, y: via.y },
    radius: via.hole_diameter / 2,
    fill: "#000",
    realToCanvasMat,
  })
  ctx.restore()

  drawCircle({
    ctx,
    center: { x: via.x, y: via.y },
    radius: via.hole_diameter / 2,
    fill: colorMap.drill,
    realToCanvasMat,
  })
}
