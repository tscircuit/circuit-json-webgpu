import type { CanvasContext } from "../../types"

export function cutPathFromSoldermask(ctx: CanvasContext): void {
  ctx.save()
  ctx.globalCompositeOperation = "destination-out"
  ctx.fill()
  ctx.restore()
}
