import type { LayerRef, PcbPlatedHole } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { drawCircle } from "../shapes/circle"
import { drawOval } from "../shapes/oval"
import { drawPill } from "../shapes/pill"
import { drawPolygon } from "../shapes/polygon"
import { drawRect } from "../shapes/rect"
import type { CanvasContext, PcbColorMap } from "../types"
import { offsetPolygonPoints } from "./soldermask-margin"

export interface DrawPcbPlatedHoleParams {
  ctx: CanvasContext
  hole: PcbPlatedHole
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
  soldermaskMargin?: number
  drawSoldermask?: boolean
  layer?: LayerRef
}

export function drawPcbPlatedHole(params: DrawPcbPlatedHoleParams): void {
  const {
    ctx,
    hole,
    realToCanvasMat,
    colorMap,
    soldermaskMargin = 0,
    drawSoldermask,
  } = params

  // Skip holes that are fully covered with soldermask when soldermask is enabled,
  // as they should have been handled by soldermask processing.
  // When soldermask is disabled, fully covered holes should be drawn as normal copper.
  if (hole.is_covered_with_solder_mask === true && drawSoldermask) {
    return
  }

  const copperColor = colorMap.copper[params.layer ?? "top"]

  // For negative margins, draw smaller copper (inset by margin amount)
  const copperInset = soldermaskMargin < 0 ? Math.abs(soldermaskMargin) : 0

  if (hole.shape === "circle") {
    // Draw outer copper ring (smaller if negative margin)
    drawCircle({
      ctx,
      center: { x: hole.x, y: hole.y },
      radius: hole.outer_diameter / 2 - copperInset,
      fill: copperColor,
      realToCanvasMat,
    })

    // Cut inner drill hole out of copper, then paint drill color.
    cutCurrentLayer(ctx, () => {
      drawCircle({
        ctx,
        center: { x: hole.x, y: hole.y },
        radius: hole.hole_diameter / 2,
        fill: "#000",
        realToCanvasMat,
      })
    })

    drawCircle({
      ctx,
      center: { x: hole.x, y: hole.y },
      radius: hole.hole_diameter / 2,
      fill: colorMap.drill,
      realToCanvasMat,
    })
    return
  }

  if (hole.shape === "oval") {
    // Draw outer copper oval (smaller if negative margin)
    drawOval({
      ctx,
      center: { x: hole.x, y: hole.y },
      radius_x: hole.outer_width / 2 - copperInset,
      radius_y: hole.outer_height / 2 - copperInset,
      fill: copperColor,
      realToCanvasMat,
      rotation: hole.ccw_rotation,
    })

    // Cut inner drill hole out of copper, then paint drill color.
    cutCurrentLayer(ctx, () => {
      drawOval({
        ctx,
        center: { x: hole.x, y: hole.y },
        radius_x: hole.hole_width / 2,
        radius_y: hole.hole_height / 2,
        fill: "#000",
        realToCanvasMat,
        rotation: hole.ccw_rotation,
      })
    })

    drawOval({
      ctx,
      center: { x: hole.x, y: hole.y },
      radius_x: hole.hole_width / 2,
      radius_y: hole.hole_height / 2,
      fill: colorMap.drill,
      realToCanvasMat,
      rotation: hole.ccw_rotation,
    })
    return
  }

  if (hole.shape === "pill") {
    // Draw outer copper pill (smaller if negative margin)
    drawPill({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.outer_width - copperInset * 2,
      height: hole.outer_height - copperInset * 2,
      fill: copperColor,
      realToCanvasMat,
      rotation: hole.ccw_rotation,
    })

    // Cut inner drill hole out of copper, then paint drill color.
    cutCurrentLayer(ctx, () => {
      drawPill({
        ctx,
        center: { x: hole.x, y: hole.y },
        width: hole.hole_width,
        height: hole.hole_height,
        fill: "#000",
        realToCanvasMat,
        rotation: hole.ccw_rotation,
      })
    })

    drawPill({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.hole_width,
      height: hole.hole_height,
      fill: colorMap.drill,
      realToCanvasMat,
      rotation: hole.ccw_rotation,
    })
    return
  }

  if (hole.shape === "circular_hole_with_rect_pad") {
    // Draw rectangular pad (smaller if negative margin)
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.rect_pad_width - copperInset * 2,
      height: hole.rect_pad_height - copperInset * 2,
      fill: copperColor,
      realToCanvasMat,
      borderRadius: hole.rect_border_radius
        ? Math.max(0, hole.rect_border_radius - copperInset)
        : 0,
      ccwRotationDegrees: hole.rect_ccw_rotation,
    })

    // Draw circular drill hole (with offset)
    const holeX = hole.x + (hole.hole_offset_x ?? 0)
    const holeY = hole.y + (hole.hole_offset_y ?? 0)
    cutCurrentLayer(ctx, () => {
      drawCircle({
        ctx,
        center: { x: holeX, y: holeY },
        radius: hole.hole_diameter / 2,
        fill: "#000",
        realToCanvasMat,
      })
    })

    drawCircle({
      ctx,
      center: { x: holeX, y: holeY },
      radius: hole.hole_diameter / 2,
      fill: colorMap.drill,
      realToCanvasMat,
    })
    return
  }

  if (hole.shape === "pill_hole_with_rect_pad") {
    // Draw rectangular pad (smaller if negative margin)
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.rect_pad_width - copperInset * 2,
      height: hole.rect_pad_height - copperInset * 2,
      fill: copperColor,
      realToCanvasMat,
      borderRadius: hole.rect_border_radius
        ? Math.max(0, hole.rect_border_radius - copperInset)
        : 0,
    })

    // Draw pill drill hole (with offset)
    const holeX = hole.x + (hole.hole_offset_x ?? 0)
    const holeY = hole.y + (hole.hole_offset_y ?? 0)
    cutCurrentLayer(ctx, () => {
      drawPill({
        ctx,
        center: { x: holeX, y: holeY },
        width: hole.hole_width,
        height: hole.hole_height,
        fill: "#000",
        realToCanvasMat,
      })
    })

    drawPill({
      ctx,
      center: { x: holeX, y: holeY },
      width: hole.hole_width,
      height: hole.hole_height,
      fill: colorMap.drill,
      realToCanvasMat,
    })
    return
  }

  if (hole.shape === "rotated_pill_hole_with_rect_pad") {
    // Draw rotated rectangular pad (smaller if negative margin)
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.rect_pad_width - copperInset * 2,
      height: hole.rect_pad_height - copperInset * 2,
      fill: copperColor,
      realToCanvasMat,
      borderRadius: hole.rect_border_radius
        ? Math.max(0, hole.rect_border_radius - copperInset)
        : 0,
      ccwRotationDegrees: hole.rect_ccw_rotation,
    })

    // Draw rotated pill drill hole (with offset)
    const holeX = hole.x + (hole.hole_offset_x ?? 0)
    const holeY = hole.y + (hole.hole_offset_y ?? 0)
    cutCurrentLayer(ctx, () => {
      drawPill({
        ctx,
        center: { x: holeX, y: holeY },
        width: hole.hole_width,
        height: hole.hole_height,
        fill: "#000",
        realToCanvasMat,
        rotation: hole.hole_ccw_rotation,
      })
    })

    drawPill({
      ctx,
      center: { x: holeX, y: holeY },
      width: hole.hole_width,
      height: hole.hole_height,
      fill: colorMap.drill,
      realToCanvasMat,
      rotation: hole.hole_ccw_rotation,
    })
    return
  }

  if (hole.shape === "hole_with_polygon_pad") {
    const padOutline = hole.pad_outline
    if (padOutline && padOutline.length >= 3) {
      // Transform pad_outline points to be relative to hole.x, hole.y
      const padPoints = padOutline.map((point: { x: number; y: number }) => ({
        x: hole.x + point.x,
        y: hole.y + point.y,
      }))

      // Draw polygon pad (smaller if negative margin)
      const copperPoints =
        copperInset > 0
          ? offsetPolygonPoints(padPoints, -copperInset)
          : padPoints
      if (copperPoints.length >= 3) {
        drawPolygon({
          ctx,
          points: copperPoints,
          fill: copperColor,
          realToCanvasMat,
        })
      }
    }

    // Draw drill hole (with offset)
    const holeX = hole.x + (hole.hole_offset_x ?? 0)
    const holeY = hole.y + (hole.hole_offset_y ?? 0)
    const holeShape = hole.hole_shape

    if (holeShape === "circle") {
      cutCurrentLayer(ctx, () => {
        drawCircle({
          ctx,
          center: { x: holeX, y: holeY },
          radius: (hole.hole_diameter ?? 0) / 2,
          fill: "#000",
          realToCanvasMat,
        })
      })

      drawCircle({
        ctx,
        center: { x: holeX, y: holeY },
        radius: (hole.hole_diameter ?? 0) / 2,
        fill: colorMap.drill,
        realToCanvasMat,
      })
    } else if (holeShape === "oval") {
      cutCurrentLayer(ctx, () => {
        drawOval({
          ctx,
          center: { x: holeX, y: holeY },
          radius_x: (hole.hole_width ?? 0) / 2,
          radius_y: (hole.hole_height ?? 0) / 2,
          fill: "#000",
          realToCanvasMat,
        })
      })

      drawOval({
        ctx,
        center: { x: holeX, y: holeY },
        radius_x: (hole.hole_width ?? 0) / 2,
        radius_y: (hole.hole_height ?? 0) / 2,
        fill: colorMap.drill,
        realToCanvasMat,
      })
    } else if (holeShape === "pill") {
      cutCurrentLayer(ctx, () => {
        drawPill({
          ctx,
          center: { x: holeX, y: holeY },
          width: hole.hole_width ?? 0,
          height: hole.hole_height ?? 0,
          fill: "#000",
          realToCanvasMat,
        })
      })

      drawPill({
        ctx,
        center: { x: holeX, y: holeY },
        width: hole.hole_width ?? 0,
        height: hole.hole_height ?? 0,
        fill: colorMap.drill,
        realToCanvasMat,
      })
    } else if (holeShape === "rotated_pill") {
      cutCurrentLayer(ctx, () => {
        drawPill({
          ctx,
          center: { x: holeX, y: holeY },
          width: hole.hole_width ?? 0,
          height: hole.hole_height ?? 0,
          fill: "#000",
          realToCanvasMat,
        })
      })

      drawPill({
        ctx,
        center: { x: holeX, y: holeY },
        width: hole.hole_width ?? 0,
        height: hole.hole_height ?? 0,
        fill: colorMap.drill,
        realToCanvasMat,
      })
    }
    return
  }
}

function cutCurrentLayer(ctx: CanvasContext, drawCutPath: () => void): void {
  ctx.save()
  ctx.globalCompositeOperation = "destination-out"
  drawCutPath()
  ctx.restore()
}
