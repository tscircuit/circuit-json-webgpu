import { applyToPoint, compose, rotate, translate } from "transformation-matrix"
import type { CanvasContext } from "../../types"

/**
 * Draws a pill/stadium shape path centered at (cx, cy).
 * A pill is a rectangle with fully rounded ends (semicircular caps).
 * The path is not filled or stroked - call ctx.fill() or ctx.stroke() after.
 */
export function drawPillPath(params: {
  ctx: CanvasContext
  cx: number
  cy: number
  width: number
  height: number
  ccwRotationDegrees?: number
}): void {
  const {
    ctx,
    cx: centerX,
    cy: centerY,
    width,
    height,
    ccwRotationDegrees = 0,
  } = params

  const ccwRotationRadians = (ccwRotationDegrees * Math.PI) / 180
  const realToPxTransform = compose(
    translate(centerX, centerY),
    rotate(-ccwRotationRadians),
  )

  if (width > height) {
    // Horizontal pill: rectangle with semicircular caps on left and right
    const semicircleRadius = height / 2
    const semicircleCenterOffset = (width - height) / 2
    const leftSemicircleCenter = applyToPoint(realToPxTransform, {
      x: -semicircleCenterOffset,
      y: 0,
    })
    const rightSemicircleCenter = applyToPoint(realToPxTransform, {
      x: semicircleCenterOffset,
      y: 0,
    })

    const startPoint = applyToPoint(realToPxTransform, {
      x: semicircleCenterOffset,
      y: -semicircleRadius,
    })
    ctx.moveTo(startPoint.x, startPoint.y)

    ctx.arc(
      rightSemicircleCenter.x,
      rightSemicircleCenter.y,
      semicircleRadius,
      -ccwRotationRadians - Math.PI / 2,
      -ccwRotationRadians + Math.PI / 2,
    )
    ctx.arc(
      leftSemicircleCenter.x,
      leftSemicircleCenter.y,
      semicircleRadius,
      -ccwRotationRadians + Math.PI / 2,
      -ccwRotationRadians - Math.PI / 2,
    )
  } else if (height > width) {
    // Vertical pill: rectangle with semicircular caps on top and bottom
    const semicircleRadius = width / 2
    const semicircleCenterOffset = (height - width) / 2
    const topSemicircleCenter = applyToPoint(realToPxTransform, {
      x: 0,
      y: -semicircleCenterOffset,
    })
    const bottomSemicircleCenter = applyToPoint(realToPxTransform, {
      x: 0,
      y: semicircleCenterOffset,
    })

    const startPoint = applyToPoint(realToPxTransform, {
      x: semicircleRadius,
      y: semicircleCenterOffset,
    })
    ctx.moveTo(startPoint.x, startPoint.y)

    ctx.arc(
      bottomSemicircleCenter.x,
      bottomSemicircleCenter.y,
      semicircleRadius,
      -ccwRotationRadians,
      -ccwRotationRadians + Math.PI,
    )
    ctx.arc(
      topSemicircleCenter.x,
      topSemicircleCenter.y,
      semicircleRadius,
      -ccwRotationRadians + Math.PI,
      -ccwRotationRadians,
    )
  } else {
    // Circle: fallback when width equals height
    const radius = width / 2
    ctx.moveTo(centerX + radius, centerY)
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
  }
  ctx.closePath()
}
