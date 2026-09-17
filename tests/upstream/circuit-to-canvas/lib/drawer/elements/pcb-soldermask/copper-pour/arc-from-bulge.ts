import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../../../types"

function computeArcFromBulge(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  bulge: number,
): { centerX: number; centerY: number; radius: number } | null {
  if (Math.abs(bulge) < 1e-10) return null

  const chordX = endX - startX
  const chordY = endY - startY
  const chordLength = Math.hypot(chordX, chordY)
  if (chordLength < 1e-10) return null

  const sagitta = Math.abs(bulge) * (chordLength / 2)
  const halfChord = chordLength / 2
  const radius = (sagitta * sagitta + halfChord * halfChord) / (2 * sagitta)
  const distToCenter = radius - sagitta
  const midX = (startX + endX) / 2
  const midY = (startY + endY) / 2
  const perpX = -chordY / chordLength
  const perpY = chordX / chordLength
  const sign = bulge > 0 ? -1 : 1

  return {
    centerX: midX + sign * perpX * distToCenter,
    centerY: midY + sign * perpY * distToCenter,
    radius,
  }
}

export function drawArcFromBulge(
  ctx: CanvasContext,
  realStartX: number,
  realStartY: number,
  realEndX: number,
  realEndY: number,
  bulge: number,
  realToCanvasMat: Matrix,
): void {
  if (Math.abs(bulge) < 1e-10) {
    const [endX, endY] = applyToPoint(realToCanvasMat, [realEndX, realEndY])
    ctx.lineTo(endX, endY)
    return
  }

  const arc = computeArcFromBulge(
    realStartX,
    realStartY,
    realEndX,
    realEndY,
    bulge,
  )
  if (!arc) {
    const [endX, endY] = applyToPoint(realToCanvasMat, [realEndX, realEndY])
    ctx.lineTo(endX, endY)
    return
  }

  const [canvasStartX, canvasStartY] = applyToPoint(realToCanvasMat, [
    realStartX,
    realStartY,
  ])
  const [canvasEndX, canvasEndY] = applyToPoint(realToCanvasMat, [
    realEndX,
    realEndY,
  ])
  const [canvasCenterX, canvasCenterY] = applyToPoint(realToCanvasMat, [
    arc.centerX,
    arc.centerY,
  ])

  const canvasRadius = Math.hypot(
    canvasStartX - canvasCenterX,
    canvasStartY - canvasCenterY,
  )
  const startAngle = Math.atan2(
    canvasStartY - canvasCenterY,
    canvasStartX - canvasCenterX,
  )
  const endAngle = Math.atan2(
    canvasEndY - canvasCenterY,
    canvasEndX - canvasCenterX,
  )
  const det =
    realToCanvasMat.a * realToCanvasMat.d -
    realToCanvasMat.b * realToCanvasMat.c
  const isFlipped = det < 0
  const counterclockwise = bulge > 0 ? !isFlipped : isFlipped

  ctx.arc(
    canvasCenterX,
    canvasCenterY,
    canvasRadius,
    startAngle,
    endAngle,
    counterclockwise,
  )
}
