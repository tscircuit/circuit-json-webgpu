import type { CanvasContext } from "../../types"

export function drawCirclePath(params: {
  ctx: CanvasContext
  cx: number
  cy: number
  radius: number
}): void {
  const { ctx, cx, cy, radius } = params

  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
}
