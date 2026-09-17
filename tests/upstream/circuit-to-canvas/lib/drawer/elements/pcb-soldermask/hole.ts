import type { PcbHole } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../../types"
import { drawPillPath } from "../helper-functions/draw-pill"
import { cutPathFromSoldermask } from "./cut-path-from-soldermask"
/**
 * Process soldermask for a non-plated hole.
 */
export function processHoleSoldermask(params: {
  ctx: CanvasContext
  hole: PcbHole
  realToCanvasMat: Matrix
  soldermaskOverCopperColor: string
}): void {
  const { ctx, hole, realToCanvasMat, soldermaskOverCopperColor } = params

  const isCoveredWithSoldermask = hole.is_covered_with_solder_mask === true
  const margin = hole.soldermask_margin ?? 0

  if (isCoveredWithSoldermask) {
    // Draw light green over the entire hole
    ctx.fillStyle = soldermaskOverCopperColor
    drawHoleShapePath({ ctx, hole, realToCanvasMat, margin: 0 })
    ctx.fill()
  } else if (margin < 0) {
    // Negative margin: cut a smaller opening, then draw light green ring.
    drawHoleShapePath({ ctx, hole, realToCanvasMat, margin })
    cutPathFromSoldermask(ctx)
    drawNegativeMarginRingForHole({
      ctx,
      hole,
      realToCanvasMat,
      soldermaskOverCopperColor,
      margin,
    })
  } else if (margin > 0) {
    // Positive margin: cut larger opening from soldermask.
    drawHoleShapePath({ ctx, hole, realToCanvasMat, margin })
    cutPathFromSoldermask(ctx)
  } else {
    // Zero margin: cut hole opening from soldermask.
    drawHoleShapePath({ ctx, hole, realToCanvasMat, margin: 0 })
    cutPathFromSoldermask(ctx)
  }
}

function getHoleRotation(hole: PcbHole): number {
  if ("ccw_rotation" in hole && typeof hole.ccw_rotation === "number") {
    return hole.ccw_rotation
  }
  return 0
}

function drawHoleShapePath(params: {
  ctx: CanvasContext
  hole: PcbHole
  realToCanvasMat: Matrix
  margin: number
}): void {
  const { ctx, hole, realToCanvasMat, margin } = params
  const rotation = getHoleRotation(hole)

  if (hole.hole_shape === "circle") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledRadius =
      (hole.hole_diameter / 2 + margin) * Math.abs(realToCanvasMat.a)

    ctx.beginPath()
    ctx.arc(cx, cy, scaledRadius, 0, Math.PI * 2)
    ctx.closePath()
  } else if (hole.hole_shape === "square") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledSize =
      (hole.hole_diameter + margin * 2) * Math.abs(realToCanvasMat.a)

    ctx.save()
    ctx.translate(cx, cy)
    if (rotation !== 0) {
      ctx.rotate((-rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    ctx.rect(-scaledSize / 2, -scaledSize / 2, scaledSize, scaledSize)
    ctx.closePath()
    ctx.restore()
  } else if (hole.hole_shape === "oval") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledRadiusX =
      (hole.hole_width / 2 + margin) * Math.abs(realToCanvasMat.a)
    const scaledRadiusY =
      (hole.hole_height / 2 + margin) * Math.abs(realToCanvasMat.a)

    ctx.save()
    ctx.translate(cx, cy)
    if (rotation !== 0) {
      ctx.rotate((-rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    ctx.ellipse(0, 0, scaledRadiusX, scaledRadiusY, 0, 0, Math.PI * 2)
    ctx.closePath()
    ctx.restore()
  } else if (hole.hole_shape === "rect") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledWidth =
      (hole.hole_width + margin * 2) * Math.abs(realToCanvasMat.a)
    const scaledHeight =
      (hole.hole_height + margin * 2) * Math.abs(realToCanvasMat.a)

    ctx.save()
    ctx.translate(cx, cy)
    if (rotation !== 0) {
      ctx.rotate((-rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    ctx.rect(-scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)
    ctx.closePath()
    ctx.restore()
  } else if (hole.hole_shape === "pill" || hole.hole_shape === "rotated_pill") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledWidth =
      (hole.hole_width + margin * 2) * Math.abs(realToCanvasMat.a)
    const scaledHeight =
      (hole.hole_height + margin * 2) * Math.abs(realToCanvasMat.a)

    ctx.save()
    ctx.translate(cx, cy)
    if (rotation !== 0) {
      ctx.rotate((-rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    drawPillPath({
      ctx,
      cx: 0,
      cy: 0,
      width: scaledWidth,
      height: scaledHeight,
    })
    ctx.restore()
  }
}

function drawNegativeMarginRingForHole(params: {
  ctx: CanvasContext
  hole: PcbHole
  realToCanvasMat: Matrix
  soldermaskOverCopperColor: string
  margin: number
}): void {
  const { ctx, hole, realToCanvasMat, soldermaskOverCopperColor, margin } =
    params
  const thickness = Math.abs(margin)
  const rotation = getHoleRotation(hole)

  ctx.fillStyle = soldermaskOverCopperColor

  if (hole.hole_shape === "circle") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledRadius = (hole.hole_diameter / 2) * Math.abs(realToCanvasMat.a)
    const scaledThickness = thickness * Math.abs(realToCanvasMat.a)
    const innerRadius = Math.max(0, scaledRadius - scaledThickness)

    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, scaledRadius, 0, Math.PI * 2)
    if (innerRadius > 0) {
      ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2, true)
    }
    ctx.fill("evenodd")
    ctx.restore()
  } else if (hole.hole_shape === "square") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledSize = hole.hole_diameter * Math.abs(realToCanvasMat.a)
    const scaledThickness = thickness * Math.abs(realToCanvasMat.a)
    const innerSize = Math.max(0, scaledSize - scaledThickness * 2)

    ctx.save()
    ctx.translate(cx, cy)
    if (rotation !== 0) {
      ctx.rotate((-rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    ctx.rect(-scaledSize / 2, -scaledSize / 2, scaledSize, scaledSize)
    if (innerSize > 0) {
      ctx.rect(-innerSize / 2, -innerSize / 2, innerSize, innerSize)
    }
    ctx.fill("evenodd")
    ctx.restore()
  } else if (hole.hole_shape === "oval") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledRadiusX = (hole.hole_width / 2) * Math.abs(realToCanvasMat.a)
    const scaledRadiusY = (hole.hole_height / 2) * Math.abs(realToCanvasMat.a)
    const scaledThickness = thickness * Math.abs(realToCanvasMat.a)
    const innerRadiusX = Math.max(0, scaledRadiusX - scaledThickness)
    const innerRadiusY = Math.max(0, scaledRadiusY - scaledThickness)

    ctx.save()
    ctx.translate(cx, cy)
    if (rotation !== 0) {
      ctx.rotate((-rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    ctx.ellipse(0, 0, scaledRadiusX, scaledRadiusY, 0, 0, Math.PI * 2)
    if (innerRadiusX > 0 && innerRadiusY > 0) {
      ctx.moveTo(innerRadiusX, 0)
      ctx.ellipse(0, 0, innerRadiusX, innerRadiusY, 0, 0, Math.PI * 2)
    }
    ctx.fill("evenodd")
    ctx.restore()
  } else if (hole.hole_shape === "rect") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledWidth = hole.hole_width * Math.abs(realToCanvasMat.a)
    const scaledHeight = hole.hole_height * Math.abs(realToCanvasMat.a)
    const scaledThickness = thickness * Math.abs(realToCanvasMat.a)
    const innerWidth = Math.max(0, scaledWidth - scaledThickness * 2)
    const innerHeight = Math.max(0, scaledHeight - scaledThickness * 2)

    ctx.save()
    ctx.translate(cx, cy)
    if (rotation !== 0) {
      ctx.rotate((-rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    ctx.rect(-scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)
    if (innerWidth > 0 && innerHeight > 0) {
      ctx.rect(-innerWidth / 2, -innerHeight / 2, innerWidth, innerHeight)
    }
    ctx.fill("evenodd")
    ctx.restore()
  } else if (hole.hole_shape === "pill" || hole.hole_shape === "rotated_pill") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledWidth = hole.hole_width * Math.abs(realToCanvasMat.a)
    const scaledHeight = hole.hole_height * Math.abs(realToCanvasMat.a)
    const scaledThickness = thickness * Math.abs(realToCanvasMat.a)

    ctx.save()
    ctx.translate(cx, cy)
    if (rotation !== 0) {
      ctx.rotate((-rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    drawPillPath({
      ctx,
      cx: 0,
      cy: 0,
      width: scaledWidth,
      height: scaledHeight,
    })

    const innerWidth = scaledWidth - scaledThickness * 2
    const innerHeight = scaledHeight - scaledThickness * 2
    if (innerWidth > 0 && innerHeight > 0) {
      drawPillPath({
        ctx,
        cx: 0,
        cy: 0,
        width: innerWidth,
        height: innerHeight,
      })
    }

    ctx.fill("evenodd")
    ctx.restore()
  }
}
