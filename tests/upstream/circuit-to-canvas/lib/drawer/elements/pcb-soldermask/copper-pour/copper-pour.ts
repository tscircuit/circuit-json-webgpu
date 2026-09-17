import type { AnyCircuitElement, PcbCopperPour } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../../../types"
import { cutCoveredPourOpenings } from "./cut-covered-pour-openings"
import { drawRing } from "./draw-ring"

export function processCopperPourSoldermask(params: {
  ctx: CanvasContext
  pour: PcbCopperPour
  realToCanvasMat: Matrix
  soldermaskOverCopperColor: string
  layer: "top" | "bottom"
  elements: AnyCircuitElement[]
}): void {
  const {
    ctx,
    pour,
    realToCanvasMat,
    soldermaskOverCopperColor,
    layer,
    elements,
  } = params
  if (pour.layer !== layer) return
  if (pour.covered_with_solder_mask !== true) return

  ctx.save()
  ctx.fillStyle = soldermaskOverCopperColor

  if (pour.shape === "rect") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [
      pour.center.x,
      pour.center.y,
    ])
    const scaledWidth = pour.width * Math.abs(realToCanvasMat.a)
    const scaledHeight = pour.height * Math.abs(realToCanvasMat.a)

    ctx.translate(cx, cy)
    if (pour.rotation) {
      ctx.rotate(-pour.rotation * (Math.PI / 180))
    }
    ctx.beginPath()
    ctx.rect(-scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)
    ctx.fill()
    ctx.restore()
    cutCoveredPourOpenings({
      ctx,
      elements,
      layer,
      realToCanvasMat,
    })
    return
  }

  if (pour.shape === "polygon") {
    if (pour.points && pour.points.length >= 3) {
      const canvasPoints = pour.points.map((p: { x: number; y: number }) =>
        applyToPoint(realToCanvasMat, [p.x, p.y]),
      )
      const firstPoint = canvasPoints[0]
      if (firstPoint) {
        ctx.beginPath()
        const [firstX, firstY] = firstPoint
        ctx.moveTo(firstX, firstY)
        for (let i = 1; i < canvasPoints.length; i++) {
          const point = canvasPoints[i]
          if (!point) continue
          const [x, y] = point
          ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fill()
        cutCoveredPourOpenings({
          ctx,
          elements,
          layer,
          realToCanvasMat,
        })
      }
    }
    ctx.restore()
    return
  }

  if (pour.shape === "brep") {
    ctx.beginPath()
    drawRing(ctx, pour.brep_shape.outer_ring, realToCanvasMat)
    if (pour.brep_shape.inner_rings) {
      for (const innerRing of pour.brep_shape.inner_rings) {
        drawRing(ctx, innerRing, realToCanvasMat)
      }
    }
    ctx.fill("evenodd")
    cutCoveredPourOpenings({
      ctx,
      elements,
      layer,
      realToCanvasMat,
    })
    ctx.restore()
    return
  }

  ctx.restore()
}
