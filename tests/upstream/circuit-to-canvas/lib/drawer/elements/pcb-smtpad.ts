import type {
  PcbCutout,
  PcbHole,
  PcbPlatedHole,
  PcbSmtPad,
  PcbVia,
} from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { drawCircle } from "../shapes/circle"
import { drawPill } from "../shapes/pill"
import { drawPolygon } from "../shapes/polygon"
import { drawRect } from "../shapes/rect"
import type { CanvasContext, PcbColorMap } from "../types"
import {
  drawPadWithDrillCutouts,
  getPadDrillCutouts,
} from "./helper-functions/pcb-smtpad-drill-cutouts"

export interface DrawPcbSmtPadParams {
  ctx: CanvasContext
  pad: PcbSmtPad
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
  holes?: PcbHole[]
  platedHoles?: PcbPlatedHole[]
  vias?: PcbVia[]
  cutouts?: PcbCutout[]
}

function layerToColor(layer: string, colorMap: PcbColorMap): string {
  return (
    colorMap.copper[layer as keyof typeof colorMap.copper] ??
    colorMap.copper.top
  )
}

function getBorderRadius(pad: PcbSmtPad): number {
  if (pad.shape === "rect" || pad.shape === "rotated_rect") {
    return pad.corner_radius ?? pad.rect_border_radius ?? 0
  }
  return 0
}

export function drawPcbSmtPad(params: DrawPcbSmtPadParams): void {
  const { ctx, pad, realToCanvasMat, colorMap } = params

  const color = layerToColor(pad.layer, colorMap)
  const drillCutouts = getPadDrillCutouts(params)

  if (drillCutouts.length > 0) {
    drawPadWithDrillCutouts({
      ctx,
      pad,
      realToCanvasMat,
      color,
      drillCutouts,
    })
    return
  }

  // Draw the copper pad
  if (pad.shape === "rect") {
    drawRect({
      ctx,
      center: { x: pad.x, y: pad.y },
      width: pad.width,
      height: pad.height,
      fill: color,
      realToCanvasMat,
      borderRadius: getBorderRadius(pad),
    })
    return
  }

  if (pad.shape === "rotated_rect") {
    drawRect({
      ctx,
      center: { x: pad.x, y: pad.y },
      width: pad.width,
      height: pad.height,
      fill: color,
      realToCanvasMat,
      borderRadius: getBorderRadius(pad),
      ccwRotationDegrees: pad.ccw_rotation ?? 0,
    })
    return
  }

  if (pad.shape === "circle") {
    drawCircle({
      ctx,
      center: { x: pad.x, y: pad.y },
      radius: pad.radius,
      fill: color,
      realToCanvasMat,
    })
    return
  }

  if (pad.shape === "pill") {
    drawPill({
      ctx,
      center: { x: pad.x, y: pad.y },
      width: pad.width,
      height: pad.height,
      fill: color,
      realToCanvasMat,
    })
    return
  }

  if (pad.shape === "rotated_pill") {
    drawPill({
      ctx,
      center: { x: pad.x, y: pad.y },
      width: pad.width,
      height: pad.height,
      fill: color,
      realToCanvasMat,
      rotation: pad.ccw_rotation ?? 0,
    })
    return
  }

  if (pad.shape === "polygon") {
    if (pad.points && pad.points.length >= 3) {
      drawPolygon({
        ctx,
        points: pad.points,
        fill: color,
        realToCanvasMat,
      })
    }
    return
  }
}
