import type { Ring } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../../../types"
import { drawArcFromBulge } from "./arc-from-bulge"

export function drawRing(
  ctx: CanvasContext,
  ring: Ring,
  realToCanvasMat: Matrix,
): void {
  if (ring.vertices.length < 2) return

  if (ring.vertices.length === 2) {
    const v0 = ring.vertices[0]
    const v1 = ring.vertices[1]
    if (
      v0 &&
      v1 &&
      Math.abs((v0.bulge ?? 0) - 1) < 1e-10 &&
      Math.abs((v1.bulge ?? 0) - 1) < 1e-10
    ) {
      const [x0, y0] = applyToPoint(realToCanvasMat, [v0.x, v0.y])
      ctx.moveTo(x0, y0)
      drawArcFromBulge(ctx, v0.x, v0.y, v1.x, v1.y, 1, realToCanvasMat)
      drawArcFromBulge(ctx, v1.x, v1.y, v0.x, v0.y, 1, realToCanvasMat)
      return
    }
  }

  const firstVertex = ring.vertices[0]
  if (!firstVertex) return
  const [firstX, firstY] = applyToPoint(realToCanvasMat, [
    firstVertex.x,
    firstVertex.y,
  ])
  ctx.moveTo(firstX, firstY)

  for (let i = 0; i < ring.vertices.length; i++) {
    const currentVertex = ring.vertices[i]
    const nextVertex = ring.vertices[(i + 1) % ring.vertices.length]
    if (!currentVertex || !nextVertex) continue

    const bulge = currentVertex.bulge ?? 0
    if (Math.abs(bulge) < 1e-10) {
      const [nextX, nextY] = applyToPoint(realToCanvasMat, [
        nextVertex.x,
        nextVertex.y,
      ])
      ctx.lineTo(nextX, nextY)
    } else {
      drawArcFromBulge(
        ctx,
        currentVertex.x,
        currentVertex.y,
        nextVertex.x,
        nextVertex.y,
        bulge,
        realToCanvasMat,
      )
    }
  }
}
