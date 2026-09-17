import type { PcbPlatedHole } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../../types"
import { drawPillPath } from "../helper-functions/draw-pill"
import { drawPolygonPath } from "../helper-functions/draw-polygon"
import { drawRoundedRectPath } from "../helper-functions/draw-rounded-rect"
import { offsetPolygonPoints } from "../soldermask-margin"
import { cutPathFromSoldermask } from "./cut-path-from-soldermask"
/**
 * Process soldermask for a plated hole.
 */
export function processPlatedHoleSoldermask(params: {
  ctx: CanvasContext
  hole: PcbPlatedHole
  realToCanvasMat: Matrix
  soldermaskOverCopperColor: string
  layer: "top" | "bottom"
}): void {
  const { ctx, hole, realToCanvasMat, soldermaskOverCopperColor, layer } =
    params
  // Check if this hole is on the current layer
  if (hole.layers && !hole.layers.includes(layer)) return

  const isCoveredWithSoldermask = hole.is_covered_with_solder_mask === true
  const margin = hole.soldermask_margin ?? 0

  if (isCoveredWithSoldermask) {
    // Draw light green over the entire hole copper ring
    ctx.fillStyle = soldermaskOverCopperColor
    drawPlatedHoleShapePath({ ctx, hole, realToCanvasMat, margin: 0 })
    ctx.fill()
  } else if (margin < 0) {
    // Negative margin: open the inner copper area, then draw mask-over-copper ring
    drawPlatedHoleShapePath({ ctx, hole, realToCanvasMat, margin })
    cutPathFromSoldermask(ctx)

    drawNegativeMarginRingForPlatedHole({
      ctx,
      hole,
      realToCanvasMat,
      soldermaskOverCopperColor,
      margin,
    })
  } else if (margin > 0) {
    // Positive margin: cut larger opening from the soldermask.
    drawPlatedHoleShapePath({ ctx, hole, realToCanvasMat, margin })
    cutPathFromSoldermask(ctx)
  } else {
    // Zero margin: cut pad opening from the soldermask.
    drawPlatedHoleShapePath({ ctx, hole, realToCanvasMat, margin: 0 })
    cutPathFromSoldermask(ctx)
  }
}

function drawPlatedHoleShapePath(params: {
  ctx: CanvasContext
  hole: PcbPlatedHole
  realToCanvasMat: Matrix
  margin: number
}): void {
  const { ctx, hole, realToCanvasMat, margin } = params
  if (hole.shape === "circle") {
    const [centerX, centerY] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const radius =
      (hole.outer_diameter / 2 + margin) * Math.abs(realToCanvasMat.a)

    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.closePath()
  } else if (hole.shape === "oval") {
    const [centerX, centerY] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const ovalRadiusX =
      (hole.outer_width / 2 + margin) * Math.abs(realToCanvasMat.a)
    const ovalRadiusY =
      (hole.outer_height / 2 + margin) * Math.abs(realToCanvasMat.a)

    ctx.beginPath()
    ctx.ellipse(
      centerX,
      centerY,
      ovalRadiusX,
      ovalRadiusY,
      -((hole.ccw_rotation ?? 0) * Math.PI) / 180,
      0,
      Math.PI * 2,
    )
    ctx.closePath()
  } else if (hole.shape === "pill") {
    const [centerX, centerY] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const pillWidth =
      (hole.outer_width + margin * 2) * Math.abs(realToCanvasMat.a)
    const pillHeight =
      (hole.outer_height + margin * 2) * Math.abs(realToCanvasMat.a)

    ctx.beginPath()
    drawPillPath({
      ctx,
      cx: centerX,
      cy: centerY,
      width: pillWidth,
      height: pillHeight,
      ccwRotationDegrees: hole.ccw_rotation,
    })
  } else if (hole.shape === "circular_hole_with_rect_pad") {
    const [centerX, centerY] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const rectPadWidth =
      (hole.rect_pad_width + margin * 2) * Math.abs(realToCanvasMat.a)
    const rectPadHeight =
      (hole.rect_pad_height + margin * 2) * Math.abs(realToCanvasMat.a)
    const rectPadCornerRadius =
      (hole.rect_border_radius ?? 0) * Math.abs(realToCanvasMat.a)

    ctx.beginPath()
    drawRoundedRectPath({
      ctx,
      cx: centerX,
      cy: centerY,
      width: rectPadWidth,
      height: rectPadHeight,
      radius: rectPadCornerRadius,
      ccwRotationDegrees: hole.rect_ccw_rotation,
    })
  } else if (hole.shape === "pill_hole_with_rect_pad") {
    const [centerX, centerY] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const rectPadWidth =
      (hole.rect_pad_width + margin * 2) * Math.abs(realToCanvasMat.a)
    const rectPadHeight =
      (hole.rect_pad_height + margin * 2) * Math.abs(realToCanvasMat.a)
    const rectPadCornerRadius =
      (hole.rect_border_radius ?? 0) * Math.abs(realToCanvasMat.a)

    ctx.beginPath()
    drawRoundedRectPath({
      ctx,
      cx: centerX,
      cy: centerY,
      width: rectPadWidth,
      height: rectPadHeight,
      radius: rectPadCornerRadius,
    })
  } else if (hole.shape === "rotated_pill_hole_with_rect_pad") {
    const [centerX, centerY] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const rectPadWidth =
      (hole.rect_pad_width + margin * 2) * Math.abs(realToCanvasMat.a)
    const rectPadHeight =
      (hole.rect_pad_height + margin * 2) * Math.abs(realToCanvasMat.a)
    const rectPadCornerRadius =
      (hole.rect_border_radius ?? 0) * Math.abs(realToCanvasMat.a)

    ctx.beginPath()
    drawRoundedRectPath({
      ctx,
      cx: centerX,
      cy: centerY,
      width: rectPadWidth,
      height: rectPadHeight,
      radius: rectPadCornerRadius,
      ccwRotationDegrees: hole.rect_ccw_rotation,
    })
  } else if (
    hole.shape === "hole_with_polygon_pad" &&
    hole.pad_outline &&
    hole.pad_outline.length >= 3
  ) {
    const padPoints = hole.pad_outline.map(
      (point: { x: number; y: number }) => ({
        x: hole.x + point.x,
        y: hole.y + point.y,
      }),
    )
    const marginPoints =
      margin !== 0 ? offsetPolygonPoints(padPoints, margin) : padPoints
    const canvasPoints = marginPoints.map((p) => {
      const [x, y] = applyToPoint(realToCanvasMat, [p.x, p.y])
      return { x, y }
    })

    ctx.beginPath()
    drawPolygonPath({ ctx, points: canvasPoints })
  }
}

function drawNegativeMarginRingForPlatedHole(params: {
  ctx: CanvasContext
  hole: PcbPlatedHole
  realToCanvasMat: Matrix
  soldermaskOverCopperColor: string
  margin: number
}): void {
  const { ctx, hole, realToCanvasMat, soldermaskOverCopperColor, margin } =
    params
  const marginThickness = Math.abs(margin)

  ctx.fillStyle = soldermaskOverCopperColor

  if (hole.shape === "circle") {
    const [centerX, centerY] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const outerRadius = (hole.outer_diameter / 2) * Math.abs(realToCanvasMat.a)
    const marginMagnitude = marginThickness * Math.abs(realToCanvasMat.a)
    const innerRadius = Math.max(0, outerRadius - marginMagnitude)

    ctx.beginPath()
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2)
    if (innerRadius > 0) {
      // Draw inner circle counter-clockwise to create a cutout (even-odd fill)
      ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true)
    }
    ctx.fill("evenodd")
  } else if (hole.shape === "oval") {
    const [centerX, centerY] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const padRadiusX = (hole.outer_width / 2) * Math.abs(realToCanvasMat.a)
    const padRadiusY = (hole.outer_height / 2) * Math.abs(realToCanvasMat.a)
    const marginMagnitude = marginThickness * Math.abs(realToCanvasMat.a)
    const innerRadiusX = Math.max(0, padRadiusX - marginMagnitude)
    const innerRadiusY = Math.max(0, padRadiusY - marginMagnitude)

    const ccwRotation = -((hole.ccw_rotation ?? 0) * Math.PI) / 180
    ctx.beginPath()
    ctx.ellipse(
      centerX,
      centerY,
      padRadiusX,
      padRadiusY,
      ccwRotation,
      0,
      Math.PI * 2,
    )
    if (innerRadiusX > 0 && innerRadiusY > 0) {
      // Move to inner ellipse start point and draw it
      const soldermaskEllipseStartX =
        centerX + innerRadiusX * Math.cos(ccwRotation)
      const soldermaskEllipseStartY =
        centerY + innerRadiusX * Math.sin(ccwRotation)
      ctx.moveTo(soldermaskEllipseStartX, soldermaskEllipseStartY)
      ctx.ellipse(
        centerX,
        centerY,
        innerRadiusX,
        innerRadiusY,
        ccwRotation,
        0,
        Math.PI * 2,
      )
    }
    ctx.fill("evenodd")
  } else if (hole.shape === "pill") {
    const [centerX, centerY] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const padWidth = hole.outer_width * Math.abs(realToCanvasMat.a)
    const padHeight = hole.outer_height * Math.abs(realToCanvasMat.a)
    const marginMagnitude = marginThickness * Math.abs(realToCanvasMat.a)

    ctx.beginPath()
    drawPillPath({
      ctx,
      cx: centerX,
      cy: centerY,
      width: padWidth,
      height: padHeight,
      ccwRotationDegrees: hole.ccw_rotation,
    })
    const soldermaskPadWidth = padWidth - marginMagnitude * 2
    const soldermaskPadHeight = padHeight - marginMagnitude * 2
    if (soldermaskPadWidth > 0 && soldermaskPadHeight > 0) {
      drawPillPath({
        ctx,
        cx: centerX,
        cy: centerY,
        width: soldermaskPadWidth,
        height: soldermaskPadHeight,
        ccwRotationDegrees: hole.ccw_rotation,
      })
    }

    ctx.fill("evenodd")
  } else if (hole.shape === "circular_hole_with_rect_pad") {
    const [centerX, centerY] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const padWidth = hole.rect_pad_width * Math.abs(realToCanvasMat.a)
    const padHeight = hole.rect_pad_height * Math.abs(realToCanvasMat.a)
    const marginMagnitude = marginThickness * Math.abs(realToCanvasMat.a)
    const padCornerRadius = hole.rect_border_radius
      ? hole.rect_border_radius * Math.abs(realToCanvasMat.a)
      : 0

    ctx.beginPath()
    drawRoundedRectPath({
      ctx,
      cx: centerX,
      cy: centerY,
      width: padWidth,
      height: padHeight,
      radius: padCornerRadius,
      ccwRotationDegrees: hole.rect_ccw_rotation,
    })

    const soldermaskPadWidth = padWidth - marginMagnitude * 2
    const soldermaskPadHeight = padHeight - marginMagnitude * 2
    if (soldermaskPadWidth > 0 && soldermaskPadHeight > 0) {
      const soldermaskPadCornerRadius = Math.max(
        0,
        padCornerRadius - marginMagnitude,
      )
      drawRoundedRectPath({
        ctx,
        cx: centerX,
        cy: centerY,
        width: soldermaskPadWidth,
        height: soldermaskPadHeight,
        radius: soldermaskPadCornerRadius,
        ccwRotationDegrees: hole.rect_ccw_rotation,
      })
    }

    ctx.fill("evenodd")
  } else if (hole.shape === "pill_hole_with_rect_pad") {
    const [centerX, centerY] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const padWidth = hole.rect_pad_width * Math.abs(realToCanvasMat.a)
    const padHeight = hole.rect_pad_height * Math.abs(realToCanvasMat.a)
    const marginMagnitude = marginThickness * Math.abs(realToCanvasMat.a)
    const padCornerRadius = hole.rect_border_radius
      ? hole.rect_border_radius * Math.abs(realToCanvasMat.a)
      : 0

    ctx.beginPath()
    drawRoundedRectPath({
      ctx,
      cx: centerX,
      cy: centerY,
      width: padWidth,
      height: padHeight,
      radius: padCornerRadius,
    })

    const soldermaskPadWidth = padWidth - marginMagnitude * 2
    const soldermaskPadHeight = padHeight - marginMagnitude * 2
    if (soldermaskPadWidth > 0 && soldermaskPadHeight > 0) {
      const soldermaskPadCornerRadius = Math.max(
        0,
        padCornerRadius - marginMagnitude,
      )
      drawRoundedRectPath({
        ctx,
        cx: centerX,
        cy: centerY,
        width: soldermaskPadWidth,
        height: soldermaskPadHeight,
        radius: soldermaskPadCornerRadius,
      })
    }

    ctx.fill("evenodd")
  } else if (hole.shape === "rotated_pill_hole_with_rect_pad") {
    const [centerX, centerY] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const padWidth = hole.rect_pad_width * Math.abs(realToCanvasMat.a)
    const padHeight = hole.rect_pad_height * Math.abs(realToCanvasMat.a)
    const marginMagnitude = marginThickness * Math.abs(realToCanvasMat.a)
    const padCornerRadius = hole.rect_border_radius
      ? hole.rect_border_radius * Math.abs(realToCanvasMat.a)
      : 0

    ctx.beginPath()
    drawRoundedRectPath({
      ctx,
      cx: centerX,
      cy: centerY,
      width: padWidth,
      height: padHeight,
      radius: padCornerRadius,
      ccwRotationDegrees: hole.rect_ccw_rotation,
    })

    const soldermaskPadWidth = padWidth - marginMagnitude * 2
    const soldermaskPadHeight = padHeight - marginMagnitude * 2
    if (soldermaskPadWidth > 0 && soldermaskPadHeight > 0) {
      const soldermaskPadCornerRadius = Math.max(
        0,
        padCornerRadius - marginMagnitude,
      )
      drawRoundedRectPath({
        ctx,
        cx: centerX,
        cy: centerY,
        width: soldermaskPadWidth,
        height: soldermaskPadHeight,
        radius: soldermaskPadCornerRadius,
        ccwRotationDegrees: hole.rect_ccw_rotation,
      })
    }

    ctx.fill("evenodd")
  } else if (
    hole.shape === "hole_with_polygon_pad" &&
    hole.pad_outline &&
    hole.pad_outline.length >= 3
  ) {
    const padPoints = hole.pad_outline.map(
      (point: { x: number; y: number }) => ({
        x: hole.x + point.x,
        y: hole.y + point.y,
      }),
    )

    ctx.beginPath()

    // Draw outer polygon
    const outerPoints = padPoints.map((p) => {
      const [x, y] = applyToPoint(realToCanvasMat, [p.x, p.y])
      return { x, y }
    })
    drawPolygonPath({ ctx, points: outerPoints })

    // Draw inner polygon cutout
    const innerMarginPoints = offsetPolygonPoints(padPoints, -marginThickness)
    if (innerMarginPoints.length >= 3) {
      const innerPoints = innerMarginPoints.map((p) => {
        const [x, y] = applyToPoint(realToCanvasMat, [p.x, p.y])
        return { x, y }
      })
      drawPolygonPath({ ctx, points: innerPoints })
    }

    ctx.fill("evenodd")
  }
}
