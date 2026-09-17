import type {
  AnyCircuitElement,
  PcbHole,
  PcbPlatedHole,
  PcbSmtPad,
} from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { CanvasContext } from "../../../types"
import { drawCircle } from "../../../shapes/circle"
import { drawOval } from "../../../shapes/oval"
import { drawPill } from "../../../shapes/pill"
import { drawPolygon } from "../../../shapes/polygon"
import { drawRect } from "../../../shapes/rect"

// Only used as an alpha mask while destination-out is active.
// The visible color does not matter; full alpha punches openings in the texture.
const CUTOUT_MASK_COLOR = "rgba(255, 255, 255, 1)"

export function cutCoveredPourOpenings(params: {
  ctx: CanvasContext
  elements: AnyCircuitElement[]
  layer: "top" | "bottom"
  realToCanvasMat: Matrix
}): void {
  const { ctx, elements, layer, realToCanvasMat } = params

  ctx.save()
  ctx.globalCompositeOperation = "destination-out"

  for (const element of elements) {
    if (element.type === "pcb_smtpad") {
      if (element.layer !== layer) continue
      if (element.is_covered_with_solder_mask === true) continue
      cutSmtPad({ ctx, pad: element, realToCanvasMat })
      continue
    }

    if (element.type === "pcb_plated_hole") {
      if (element.layers && !element.layers.includes(layer)) continue
      if (element.is_covered_with_solder_mask === true) continue
      cutPlatedHole({ ctx, hole: element, realToCanvasMat })
      continue
    }

    if (element.type === "pcb_via") {
      if (element.layers && !element.layers.includes(layer)) continue
      drawCircle({
        ctx,
        center: { x: element.x, y: element.y },
        radius: element.outer_diameter / 2,
        fill: CUTOUT_MASK_COLOR,
        realToCanvasMat,
      })
      continue
    }

    if (element.type === "pcb_hole") {
      if (element.is_covered_with_solder_mask === true) continue
      cutHole({ ctx, hole: element, realToCanvasMat })
    }
  }

  ctx.restore()
}

function cutSmtPad(params: {
  ctx: CanvasContext
  pad: PcbSmtPad
  realToCanvasMat: Matrix
}): void {
  const { ctx, pad, realToCanvasMat } = params

  if (pad.shape === "rect") {
    drawRect({
      ctx,
      center: { x: pad.x, y: pad.y },
      width: pad.width,
      height: pad.height,
      borderRadius: pad.corner_radius ?? pad.rect_border_radius ?? 0,
      fill: CUTOUT_MASK_COLOR,
      realToCanvasMat,
    })
    return
  }

  if (pad.shape === "rotated_rect") {
    drawRect({
      ctx,
      center: { x: pad.x, y: pad.y },
      width: pad.width,
      height: pad.height,
      borderRadius: pad.corner_radius ?? pad.rect_border_radius ?? 0,
      ccwRotationDegrees: pad.ccw_rotation ?? 0,
      fill: CUTOUT_MASK_COLOR,
      realToCanvasMat,
    })
    return
  }

  if (pad.shape === "circle") {
    drawCircle({
      ctx,
      center: { x: pad.x, y: pad.y },
      radius: pad.radius,
      fill: CUTOUT_MASK_COLOR,
      realToCanvasMat,
    })
    return
  }

  if (pad.shape === "pill" || pad.shape === "rotated_pill") {
    drawPill({
      ctx,
      center: { x: pad.x, y: pad.y },
      width: pad.width,
      height: pad.height,
      rotation: pad.shape === "rotated_pill" ? (pad.ccw_rotation ?? 0) : 0,
      fill: CUTOUT_MASK_COLOR,
      realToCanvasMat,
    })
    return
  }

  if (pad.shape === "polygon" && pad.points && pad.points.length >= 3) {
    drawPolygon({
      ctx,
      points: pad.points,
      fill: CUTOUT_MASK_COLOR,
      realToCanvasMat,
    })
  }
}

function cutPlatedHole(params: {
  ctx: CanvasContext
  hole: PcbPlatedHole
  realToCanvasMat: Matrix
}): void {
  const { ctx, hole, realToCanvasMat } = params

  if (hole.shape === "circle") {
    drawCircle({
      ctx,
      center: { x: hole.x, y: hole.y },
      radius: hole.outer_diameter / 2,
      fill: CUTOUT_MASK_COLOR,
      realToCanvasMat,
    })
    return
  }

  if (hole.shape === "oval") {
    drawOval({
      ctx,
      center: { x: hole.x, y: hole.y },
      radius_x: hole.outer_width / 2,
      radius_y: hole.outer_height / 2,
      rotation: hole.ccw_rotation,
      fill: CUTOUT_MASK_COLOR,
      realToCanvasMat,
    })
    return
  }

  if (hole.shape === "pill") {
    drawPill({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.outer_width,
      height: hole.outer_height,
      rotation: hole.ccw_rotation,
      fill: CUTOUT_MASK_COLOR,
      realToCanvasMat,
    })
    return
  }

  if (hole.shape === "circular_hole_with_rect_pad") {
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.rect_pad_width,
      height: hole.rect_pad_height,
      borderRadius: hole.rect_border_radius ?? 0,
      ccwRotationDegrees: hole.rect_ccw_rotation,
      fill: CUTOUT_MASK_COLOR,
      realToCanvasMat,
    })
    return
  }

  if (hole.shape === "pill_hole_with_rect_pad") {
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.rect_pad_width,
      height: hole.rect_pad_height,
      borderRadius: hole.rect_border_radius ?? 0,
      fill: CUTOUT_MASK_COLOR,
      realToCanvasMat,
    })
    return
  }

  if (hole.shape === "rotated_pill_hole_with_rect_pad") {
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.rect_pad_width,
      height: hole.rect_pad_height,
      borderRadius: hole.rect_border_radius ?? 0,
      ccwRotationDegrees: hole.rect_ccw_rotation,
      fill: CUTOUT_MASK_COLOR,
      realToCanvasMat,
    })
    return
  }

  if (
    hole.shape === "hole_with_polygon_pad" &&
    hole.pad_outline &&
    hole.pad_outline.length >= 3
  ) {
    drawPolygon({
      ctx,
      points: hole.pad_outline.map((point) => ({
        x: hole.x + point.x,
        y: hole.y + point.y,
      })),
      fill: CUTOUT_MASK_COLOR,
      realToCanvasMat,
    })
  }
}

function cutHole(params: {
  ctx: CanvasContext
  hole: PcbHole
  realToCanvasMat: Matrix
}): void {
  const { ctx, hole, realToCanvasMat } = params
  const rotation =
    "ccw_rotation" in hole && typeof hole.ccw_rotation === "number"
      ? hole.ccw_rotation
      : 0

  if (hole.hole_shape === "circle") {
    drawCircle({
      ctx,
      center: { x: hole.x, y: hole.y },
      radius: hole.hole_diameter / 2,
      fill: CUTOUT_MASK_COLOR,
      realToCanvasMat,
    })
    return
  }

  if (hole.hole_shape === "square") {
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.hole_diameter,
      height: hole.hole_diameter,
      ccwRotationDegrees: rotation,
      fill: CUTOUT_MASK_COLOR,
      realToCanvasMat,
    })
    return
  }

  if (hole.hole_shape === "oval") {
    drawOval({
      ctx,
      center: { x: hole.x, y: hole.y },
      radius_x: hole.hole_width / 2,
      radius_y: hole.hole_height / 2,
      rotation,
      fill: CUTOUT_MASK_COLOR,
      realToCanvasMat,
    })
    return
  }

  if (hole.hole_shape === "rect") {
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.hole_width,
      height: hole.hole_height,
      ccwRotationDegrees: rotation,
      fill: CUTOUT_MASK_COLOR,
      realToCanvasMat,
    })
    return
  }

  if (hole.hole_shape === "pill" || hole.hole_shape === "rotated_pill") {
    drawPill({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.hole_width,
      height: hole.hole_height,
      rotation,
      fill: CUTOUT_MASK_COLOR,
      realToCanvasMat,
    })
  }
}
