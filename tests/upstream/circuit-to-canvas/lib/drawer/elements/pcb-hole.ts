import type { PcbHole } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawCircle } from "../shapes/circle"
import { drawRect } from "../shapes/rect"
import { drawOval } from "../shapes/oval"
import { drawPill } from "../shapes/pill"

export interface DrawPcbHoleParams {
  ctx: CanvasContext
  hole: PcbHole
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
  soldermaskMargin?: number
  drawSoldermask?: boolean
}

// Helper function to safely access ccw_rotation property
function getRotation(hole: PcbHole): number {
  if ("ccw_rotation" in hole && typeof hole.ccw_rotation === "number") {
    return hole.ccw_rotation
  }
  return 0
}

export function drawPcbHole(params: DrawPcbHoleParams): void {
  const {
    ctx,
    hole,
    realToCanvasMat,
    colorMap,
    soldermaskMargin = 0,
    drawSoldermask = false,
  } = params

  if (drawSoldermask && hole.is_covered_with_solder_mask === true) {
    return
  }

  // For negative margins, draw smaller hole (inset by margin amount)
  const holeInset = soldermaskMargin < 0 ? Math.abs(soldermaskMargin) : 0

  if (hole.hole_shape === "circle") {
    drawCircle({
      ctx,
      center: { x: hole.x, y: hole.y },
      radius: hole.hole_diameter / 2 - holeInset,
      fill: colorMap.drill,
      realToCanvasMat,
    })
    return
  }

  if (hole.hole_shape === "square") {
    const ccwRotationDegrees = getRotation(hole)
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.hole_diameter - holeInset * 2,
      height: hole.hole_diameter - holeInset * 2,
      fill: colorMap.drill,
      realToCanvasMat,
      ccwRotationDegrees: ccwRotationDegrees,
    })
    return
  }

  if (hole.hole_shape === "oval") {
    const rotation = getRotation(hole)
    drawOval({
      ctx,
      center: { x: hole.x, y: hole.y },
      radius_x: hole.hole_width / 2 - holeInset,
      radius_y: hole.hole_height / 2 - holeInset,
      fill: colorMap.drill,
      realToCanvasMat,
      rotation,
    })
    return
  }

  if (hole.hole_shape === "rect") {
    const ccwRotationDegrees = getRotation(hole)
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.hole_width - holeInset * 2,
      height: hole.hole_height - holeInset * 2,
      fill: colorMap.drill,
      realToCanvasMat,
      ccwRotationDegrees: ccwRotationDegrees,
    })
    return
  }

  if (hole.hole_shape === "pill" || hole.hole_shape === "rotated_pill") {
    const rotation = getRotation(hole)
    drawPill({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.hole_width - holeInset * 2,
      height: hole.hole_height - holeInset * 2,
      fill: colorMap.drill,
      realToCanvasMat,
      rotation,
    })
    return
  }
}
