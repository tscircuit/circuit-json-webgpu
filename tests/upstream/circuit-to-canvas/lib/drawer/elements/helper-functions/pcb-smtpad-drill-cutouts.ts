import type {
  PcbCutout,
  PcbHole,
  PcbPlatedHole,
  PcbSmtPad,
  PcbVia,
} from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../../types"

interface DrillCutoutCircle {
  shape: "circle"
  x: number
  y: number
  radius: number
}

interface DrillCutoutOval {
  shape: "oval"
  x: number
  y: number
  radiusX: number
  radiusY: number
  rotation?: number
}

interface DrillCutoutPill {
  shape: "pill"
  x: number
  y: number
  width: number
  height: number
  rotation?: number
}

interface DrillCutoutRect {
  shape: "rect"
  x: number
  y: number
  width: number
  height: number
  radius?: number
  rotation?: number
}

interface DrillCutoutPolygon {
  shape: "polygon"
  points: Array<{ x: number; y: number }>
}

type DrillCutout =
  | DrillCutoutCircle
  | DrillCutoutOval
  | DrillCutoutPill
  | DrillCutoutRect
  | DrillCutoutPolygon

interface Bounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface PcbSmtPadDrillCutoutParams {
  pad: PcbSmtPad
  holes?: PcbHole[]
  platedHoles?: PcbPlatedHole[]
  vias?: PcbVia[]
  cutouts?: PcbCutout[]
}

export function drawPadWithDrillCutouts(params: {
  ctx: CanvasContext
  pad: PcbSmtPad
  realToCanvasMat: Matrix
  color: string
  drillCutouts: DrillCutout[]
}): void {
  const { ctx, pad, realToCanvasMat, color, drillCutouts } = params

  ctx.save()
  ctx.beginPath()
  if (!appendPadPath(ctx, pad, realToCanvasMat)) {
    ctx.restore()
    return
  }
  ctx.clip()

  ctx.beginPath()
  appendPadPath(ctx, pad, realToCanvasMat)
  for (const drillCutout of drillCutouts) {
    appendDrillCutoutPath(ctx, drillCutout, realToCanvasMat)
  }
  ctx.fillStyle = color
  ctx.fill("evenodd")
  ctx.restore()
}

export function getPadDrillCutouts(
  params: PcbSmtPadDrillCutoutParams,
): DrillCutout[] {
  const { pad, holes = [], platedHoles = [], vias = [], cutouts = [] } = params
  const padBounds = getPadBounds(pad)
  if (!padBounds) return []

  const drillCutouts: DrillCutout[] = []
  const addIfOverlapping = (cutout: DrillCutout | undefined): void => {
    if (cutout && boundsOverlap(padBounds, getDrillCutoutBounds(cutout))) {
      drillCutouts.push(cutout)
    }
  }

  for (const cutout of cutouts) {
    addIfOverlapping(getBoardCutout(cutout))
  }

  for (const hole of holes) {
    addIfOverlapping(getHoleDrillCutout(hole))
  }

  for (const platedHole of platedHoles) {
    if (!layersIncludePadLayer(platedHole.layers, pad.layer)) continue
    addIfOverlapping(getPlatedHoleDrillCutout(platedHole))
  }

  for (const via of vias) {
    if (!layersIncludePadLayer(via.layers, pad.layer)) continue

    const radius = via.hole_diameter / 2
    if (radius <= 0) continue
    const cutout: DrillCutout = {
      shape: "circle",
      x: via.x,
      y: via.y,
      radius,
    }
    addIfOverlapping(cutout)
  }

  return drillCutouts
}

function appendPadPath(
  ctx: CanvasContext,
  pad: PcbSmtPad,
  realToCanvasMat: Matrix,
): boolean {
  if (pad.shape === "rect" || pad.shape === "rotated_rect") {
    appendRectPath(ctx, {
      x: pad.x,
      y: pad.y,
      width: pad.width,
      height: pad.height,
      radius: getPadBorderRadius(pad),
      rotation: pad.shape === "rotated_rect" ? (pad.ccw_rotation ?? 0) : 0,
      realToCanvasMat,
    })
    return true
  }

  if (pad.shape === "circle") {
    appendCirclePath(ctx, {
      x: pad.x,
      y: pad.y,
      radius: pad.radius,
      realToCanvasMat,
    })
    return true
  }

  if (pad.shape === "pill" || pad.shape === "rotated_pill") {
    appendPillPath(ctx, {
      x: pad.x,
      y: pad.y,
      width: pad.width,
      height: pad.height,
      rotation: pad.shape === "rotated_pill" ? (pad.ccw_rotation ?? 0) : 0,
      realToCanvasMat,
    })
    return true
  }

  if (pad.shape === "polygon" && pad.points && pad.points.length >= 3) {
    appendPolygonPath(ctx, pad.points, realToCanvasMat)
    return true
  }

  return false
}

function appendDrillCutoutPath(
  ctx: CanvasContext,
  drillCutout: DrillCutout,
  realToCanvasMat: Matrix,
): void {
  if (drillCutout.shape === "circle") {
    appendCirclePath(ctx, {
      x: drillCutout.x,
      y: drillCutout.y,
      radius: drillCutout.radius,
      realToCanvasMat,
    })
    return
  }

  if (drillCutout.shape === "oval") {
    appendOvalPath(ctx, {
      x: drillCutout.x,
      y: drillCutout.y,
      radiusX: drillCutout.radiusX,
      radiusY: drillCutout.radiusY,
      rotation: drillCutout.rotation,
      realToCanvasMat,
    })
    return
  }

  if (drillCutout.shape === "pill") {
    appendPillPath(ctx, {
      x: drillCutout.x,
      y: drillCutout.y,
      width: drillCutout.width,
      height: drillCutout.height,
      rotation: drillCutout.rotation,
      realToCanvasMat,
    })
    return
  }

  if (drillCutout.shape === "polygon") {
    appendPolygonPath(ctx, drillCutout.points, realToCanvasMat)
    return
  }

  appendRectPath(ctx, {
    x: drillCutout.x,
    y: drillCutout.y,
    width: drillCutout.width,
    height: drillCutout.height,
    radius: drillCutout.radius,
    rotation: drillCutout.rotation,
    realToCanvasMat,
  })
}

function appendCirclePath(
  ctx: CanvasContext,
  params: {
    x: number
    y: number
    radius: number
    realToCanvasMat: Matrix
  },
): void {
  const { x, y, radius, realToCanvasMat } = params
  const [cx, cy] = applyToPoint(realToCanvasMat, [x, y])
  const scaledRadius = radius * Math.abs(realToCanvasMat.a)

  ctx.moveTo(cx + scaledRadius, cy)
  ctx.arc(cx, cy, scaledRadius, 0, Math.PI * 2)
  ctx.closePath()
}

function appendOvalPath(
  ctx: CanvasContext,
  params: {
    x: number
    y: number
    radiusX: number
    radiusY: number
    rotation?: number
    realToCanvasMat: Matrix
  },
): void {
  const { x, y, radiusX, radiusY, rotation = 0, realToCanvasMat } = params
  const [cx, cy] = applyToPoint(realToCanvasMat, [x, y])
  const scaledRadiusX = radiusX * Math.abs(realToCanvasMat.a)
  const scaledRadiusY = radiusY * Math.abs(realToCanvasMat.a)

  ctx.save()
  ctx.translate(cx, cy)
  if (rotation !== 0) {
    ctx.rotate(-rotation * (Math.PI / 180))
  }
  ctx.moveTo(scaledRadiusX, 0)
  ctx.ellipse(0, 0, scaledRadiusX, scaledRadiusY, 0, 0, Math.PI * 2)
  ctx.closePath()
  ctx.restore()
}

function appendRectPath(
  ctx: CanvasContext,
  params: {
    x: number
    y: number
    width: number
    height: number
    radius?: number
    rotation?: number
    realToCanvasMat: Matrix
  },
): void {
  const {
    x,
    y,
    width,
    height,
    radius = 0,
    rotation = 0,
    realToCanvasMat,
  } = params
  const [cx, cy] = applyToPoint(realToCanvasMat, [x, y])
  const scaledWidth = width * Math.abs(realToCanvasMat.a)
  const scaledHeight = height * Math.abs(realToCanvasMat.a)
  const scaledRadius = radius * Math.abs(realToCanvasMat.a)

  ctx.save()
  ctx.translate(cx, cy)
  if (rotation !== 0) {
    ctx.rotate(-rotation * (Math.PI / 180))
  }

  if (scaledRadius > 0) {
    const left = -scaledWidth / 2
    const top = -scaledHeight / 2
    const r = Math.min(scaledRadius, scaledWidth / 2, scaledHeight / 2)

    ctx.moveTo(left + r, top)
    ctx.lineTo(left + scaledWidth - r, top)
    ctx.arcTo(left + scaledWidth, top, left + scaledWidth, top + r, r)
    ctx.lineTo(left + scaledWidth, top + scaledHeight - r)
    ctx.arcTo(
      left + scaledWidth,
      top + scaledHeight,
      left + scaledWidth - r,
      top + scaledHeight,
      r,
    )
    ctx.lineTo(left + r, top + scaledHeight)
    ctx.arcTo(left, top + scaledHeight, left, top + scaledHeight - r, r)
    ctx.lineTo(left, top + r)
    ctx.arcTo(left, top, left + r, top, r)
    ctx.closePath()
  } else {
    ctx.rect(-scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)
  }

  ctx.restore()
}

function appendPillPath(
  ctx: CanvasContext,
  params: {
    x: number
    y: number
    width: number
    height: number
    rotation?: number
    realToCanvasMat: Matrix
  },
): void {
  const { x, y, width, height, rotation = 0, realToCanvasMat } = params
  const [cx, cy] = applyToPoint(realToCanvasMat, [x, y])
  const scaledWidth = width * Math.abs(realToCanvasMat.a)
  const scaledHeight = height * Math.abs(realToCanvasMat.a)

  ctx.save()
  ctx.translate(cx, cy)
  if (rotation !== 0) {
    ctx.rotate(-rotation * (Math.PI / 180))
  }

  if (scaledWidth > scaledHeight) {
    const radius = scaledHeight / 2
    const straightLength = scaledWidth - scaledHeight

    ctx.moveTo(-straightLength / 2, -radius)
    ctx.lineTo(straightLength / 2, -radius)
    ctx.arc(straightLength / 2, 0, radius, -Math.PI / 2, Math.PI / 2)
    ctx.lineTo(-straightLength / 2, radius)
    ctx.arc(-straightLength / 2, 0, radius, Math.PI / 2, -Math.PI / 2)
  } else if (scaledHeight > scaledWidth) {
    const radius = scaledWidth / 2
    const straightLength = scaledHeight - scaledWidth

    ctx.moveTo(radius, -straightLength / 2)
    ctx.lineTo(radius, straightLength / 2)
    ctx.arc(0, straightLength / 2, radius, 0, Math.PI)
    ctx.lineTo(-radius, -straightLength / 2)
    ctx.arc(0, -straightLength / 2, radius, Math.PI, 0)
  } else {
    ctx.moveTo(scaledWidth / 2, 0)
    ctx.arc(0, 0, scaledWidth / 2, 0, Math.PI * 2)
  }

  ctx.closePath()
  ctx.restore()
}

function appendPolygonPath(
  ctx: CanvasContext,
  points: Array<{ x: number; y: number }>,
  realToCanvasMat: Matrix,
): void {
  const firstPoint = points[0]
  if (!firstPoint) return

  const [firstX, firstY] = applyToPoint(realToCanvasMat, [
    firstPoint.x,
    firstPoint.y,
  ])
  ctx.moveTo(firstX, firstY)

  for (let i = 1; i < points.length; i++) {
    const point = points[i]
    if (!point) continue
    const [x, y] = applyToPoint(realToCanvasMat, [point.x, point.y])
    ctx.lineTo(x, y)
  }

  ctx.closePath()
}

function getPadBounds(pad: PcbSmtPad): Bounds | undefined {
  if (pad.shape === "circle") {
    return boundsAroundCenter(pad.x, pad.y, pad.radius, pad.radius)
  }

  if (
    pad.shape === "rect" ||
    pad.shape === "rotated_rect" ||
    pad.shape === "pill" ||
    pad.shape === "rotated_pill"
  ) {
    const halfDiagonal = Math.hypot(pad.width / 2, pad.height / 2)
    const isRotated =
      pad.shape === "rotated_rect" || pad.shape === "rotated_pill"
    if (isRotated && (pad.ccw_rotation ?? 0) !== 0) {
      return boundsAroundCenter(pad.x, pad.y, halfDiagonal, halfDiagonal)
    }
    return boundsAroundCenter(pad.x, pad.y, pad.width / 2, pad.height / 2)
  }

  if (pad.shape === "polygon" && pad.points && pad.points.length >= 3) {
    return getPointBounds(pad.points)
  }
}

function getDrillCutoutBounds(cutout: DrillCutout): Bounds {
  if (cutout.shape === "polygon") {
    return getPointBounds(cutout.points)
  }

  if (cutout.shape === "circle") {
    return boundsAroundCenter(cutout.x, cutout.y, cutout.radius, cutout.radius)
  }

  if (cutout.shape === "oval") {
    if ((cutout.rotation ?? 0) !== 0) {
      const halfDiagonal = Math.hypot(cutout.radiusX, cutout.radiusY)
      return boundsAroundCenter(cutout.x, cutout.y, halfDiagonal, halfDiagonal)
    }
    return boundsAroundCenter(
      cutout.x,
      cutout.y,
      cutout.radiusX,
      cutout.radiusY,
    )
  }

  const halfWidth = cutout.width / 2
  const halfHeight = cutout.height / 2
  if ((cutout.rotation ?? 0) !== 0) {
    const halfDiagonal = Math.hypot(halfWidth, halfHeight)
    return boundsAroundCenter(cutout.x, cutout.y, halfDiagonal, halfDiagonal)
  }
  return boundsAroundCenter(cutout.x, cutout.y, halfWidth, halfHeight)
}

function getBoardCutout(cutout: PcbCutout): DrillCutout | undefined {
  if (cutout.shape === "circle") {
    if (cutout.radius <= 0) return
    return {
      shape: "circle",
      x: cutout.center.x,
      y: cutout.center.y,
      radius: cutout.radius,
    }
  }

  if (cutout.shape === "rect") {
    if (cutout.width <= 0 || cutout.height <= 0) return
    return {
      shape: "rect",
      x: cutout.center.x,
      y: cutout.center.y,
      width: cutout.width,
      height: cutout.height,
      radius: cutout.corner_radius,
      rotation: cutout.rotation,
    }
  }

  if (cutout.shape === "polygon" && cutout.points.length >= 3) {
    return { shape: "polygon", points: cutout.points }
  }
}

function getPointBounds(points: Array<{ x: number; y: number }>): Bounds {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const point of points) {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
  }

  return { minX, maxX, minY, maxY }
}

function boundsAroundCenter(
  x: number,
  y: number,
  halfWidth: number,
  halfHeight: number,
): Bounds {
  return {
    minX: x - halfWidth,
    maxX: x + halfWidth,
    minY: y - halfHeight,
    maxY: y + halfHeight,
  }
}

function boundsOverlap(a: Bounds, b: Bounds): boolean {
  return (
    a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
  )
}

function getHoleDrillCutout(hole: PcbHole): DrillCutout | undefined {
  if (hole.hole_shape === "circle") {
    const radius = hole.hole_diameter / 2
    if (radius <= 0) return
    return {
      shape: "circle",
      x: hole.x,
      y: hole.y,
      radius,
    }
  }

  if (hole.hole_shape === "square") {
    if (hole.hole_diameter <= 0) return
    return {
      shape: "rect",
      x: hole.x,
      y: hole.y,
      width: hole.hole_diameter,
      height: hole.hole_diameter,
      rotation: getHoleRotation(hole),
    }
  }

  if (hole.hole_shape === "oval") {
    if (hole.hole_width <= 0 || hole.hole_height <= 0) return
    return {
      shape: "oval",
      x: hole.x,
      y: hole.y,
      radiusX: hole.hole_width / 2,
      radiusY: hole.hole_height / 2,
      rotation: getHoleRotation(hole),
    }
  }

  if (hole.hole_shape === "rect") {
    if (hole.hole_width <= 0 || hole.hole_height <= 0) return
    return {
      shape: "rect",
      x: hole.x,
      y: hole.y,
      width: hole.hole_width,
      height: hole.hole_height,
      rotation: getHoleRotation(hole),
    }
  }

  if (hole.hole_shape === "pill" || hole.hole_shape === "rotated_pill") {
    if (hole.hole_width <= 0 || hole.hole_height <= 0) return
    return {
      shape: "pill",
      x: hole.x,
      y: hole.y,
      width: hole.hole_width,
      height: hole.hole_height,
      rotation: getHoleRotation(hole),
    }
  }
}

function getPlatedHoleDrillCutout(
  hole: PcbPlatedHole,
): DrillCutout | undefined {
  if (hole.shape === "circle") {
    const radius = hole.hole_diameter / 2
    if (radius <= 0) return
    return {
      shape: "circle",
      x: hole.x,
      y: hole.y,
      radius,
    }
  }

  if (hole.shape === "oval") {
    const radiusX = hole.hole_width / 2
    const radiusY = hole.hole_height / 2
    if (radiusX <= 0 || radiusY <= 0) return
    return {
      shape: "oval",
      x: hole.x,
      y: hole.y,
      radiusX,
      radiusY,
      rotation: hole.ccw_rotation,
    }
  }

  if (hole.shape === "pill") {
    if (hole.hole_width <= 0 || hole.hole_height <= 0) return
    return {
      shape: "pill",
      x: hole.x,
      y: hole.y,
      width: hole.hole_width,
      height: hole.hole_height,
      rotation: hole.ccw_rotation,
    }
  }

  if (hole.shape === "circular_hole_with_rect_pad") {
    const radius = hole.hole_diameter / 2
    if (radius <= 0) return
    return {
      shape: "circle",
      x: hole.x + (hole.hole_offset_x ?? 0),
      y: hole.y + (hole.hole_offset_y ?? 0),
      radius,
    }
  }

  if (hole.shape === "pill_hole_with_rect_pad") {
    if (hole.hole_width <= 0 || hole.hole_height <= 0) return
    return {
      shape: "pill",
      x: hole.x + (hole.hole_offset_x ?? 0),
      y: hole.y + (hole.hole_offset_y ?? 0),
      width: hole.hole_width,
      height: hole.hole_height,
    }
  }

  if (hole.shape === "rotated_pill_hole_with_rect_pad") {
    if (hole.hole_width <= 0 || hole.hole_height <= 0) return
    return {
      shape: "pill",
      x: hole.x + (hole.hole_offset_x ?? 0),
      y: hole.y + (hole.hole_offset_y ?? 0),
      width: hole.hole_width,
      height: hole.hole_height,
      rotation: hole.hole_ccw_rotation,
    }
  }

  if (hole.shape !== "hole_with_polygon_pad") return

  const holeX = hole.x + (hole.hole_offset_x ?? 0)
  const holeY = hole.y + (hole.hole_offset_y ?? 0)
  const holeShape = hole.hole_shape

  if (holeShape === "circle") {
    const radius = (hole.hole_diameter ?? 0) / 2
    if (radius <= 0) return
    return {
      shape: "circle",
      x: holeX,
      y: holeY,
      radius,
    }
  }

  if (holeShape === "oval") {
    const radiusX = (hole.hole_width ?? 0) / 2
    const radiusY = (hole.hole_height ?? 0) / 2
    if (radiusX <= 0 || radiusY <= 0) return
    return {
      shape: "oval",
      x: holeX,
      y: holeY,
      radiusX,
      radiusY,
    }
  }

  if (holeShape === "pill" || holeShape === "rotated_pill") {
    const width = hole.hole_width ?? 0
    const height = hole.hole_height ?? 0
    if (width <= 0 || height <= 0) return
    return {
      shape: "pill",
      x: holeX,
      y: holeY,
      width,
      height,
      rotation: holeShape === "rotated_pill" ? hole.ccw_rotation : 0,
    }
  }
}

function getHoleRotation(hole: PcbHole): number {
  return "ccw_rotation" in hole && typeof hole.ccw_rotation === "number"
    ? hole.ccw_rotation
    : 0
}

function getPadBorderRadius(pad: PcbSmtPad): number {
  if (pad.shape === "rect" || pad.shape === "rotated_rect") {
    return pad.corner_radius ?? pad.rect_border_radius ?? 0
  }
  return 0
}

function layersIncludePadLayer(
  layers: readonly unknown[] | undefined,
  padLayer: unknown,
): boolean {
  if (!layers || layers.length === 0) return true
  const normalizedPadLayer = normalizeLayerName(padLayer)
  return layers.some(
    (layer) => normalizeLayerName(layer) === normalizedPadLayer,
  )
}

function normalizeLayerName(layer: unknown): string | undefined {
  if (typeof layer === "string") return layer
  if (
    layer &&
    typeof layer === "object" &&
    "name" in layer &&
    typeof layer.name === "string"
  ) {
    return layer.name
  }
}
