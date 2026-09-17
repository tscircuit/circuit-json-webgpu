import type { CanvasContext } from "../../types"

export function drawRectPath(params: {
  ctx: CanvasContext
  cx: number
  cy: number
  width: number
  height: number
}): void {
  const { ctx, cx, cy, width, height } = params

  ctx.beginPath()
  ctx.rect(cx - width / 2, cy - height / 2, width, height)
}
