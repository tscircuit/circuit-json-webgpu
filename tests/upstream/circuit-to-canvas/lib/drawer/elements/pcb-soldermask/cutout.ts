import type { PcbCutout } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../../types"
import { drawPolygonPath } from "../helper-functions/draw-polygon"
import { drawRoundedRectPath } from "../helper-functions/draw-rounded-rect"
import { cutPathFromSoldermask } from "./cut-path-from-soldermask"
/**
 * Process soldermask for a board cutout.
 * Cutouts go through the entire board, so they cut through soldermask too.
 */
export function processCutoutSoldermask(params: {
  ctx: CanvasContext
  cutout: PcbCutout
  realToCanvasMat: Matrix
}): void {
  const { ctx, cutout, realToCanvasMat } = params
  // Cutouts go through the entire board, so they cut through soldermask too

  if (cutout.shape === "rect") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [
      cutout.center?.x ?? 0,
      cutout.center?.y ?? 0,
    ])
    const scaledWidth = cutout.width * Math.abs(realToCanvasMat.a)
    const scaledHeight = cutout.height * Math.abs(realToCanvasMat.a)
    const scaledRadius =
      (cutout.corner_radius ?? 0) * Math.abs(realToCanvasMat.a)

    ctx.save()
    ctx.translate(cx, cy)
    if (cutout.rotation) {
      ctx.rotate((-cutout.rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    drawRoundedRectPath({
      ctx,
      cx: 0,
      cy: 0,
      width: scaledWidth,
      height: scaledHeight,
      radius: scaledRadius,
    })
    ctx.restore()
    cutPathFromSoldermask(ctx)
  } else if (cutout.shape === "circle") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [
      cutout.center?.x ?? 0,
      cutout.center?.y ?? 0,
    ])
    const scaledRadius = cutout.radius * Math.abs(realToCanvasMat.a)

    ctx.beginPath()
    ctx.arc(cx, cy, scaledRadius, 0, Math.PI * 2)
    ctx.closePath()
    cutPathFromSoldermask(ctx)
  } else if (
    cutout.shape === "polygon" &&
    cutout.points &&
    cutout.points.length >= 3
  ) {
    const canvasPoints = cutout.points.map((p) => {
      const [x, y] = applyToPoint(realToCanvasMat, [p.x, p.y])
      return { x, y }
    })

    ctx.beginPath()
    drawPolygonPath({ ctx, points: canvasPoints })
    cutPathFromSoldermask(ctx)
  }
}
