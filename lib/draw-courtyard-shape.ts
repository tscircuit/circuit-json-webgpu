import type { PcbCourtyardPill, PcbCourtyardPolygon } from "circuit-json"
import { type MeshBuilder, rectangle } from "./geometry"

export function drawCourtyardShape(params: {
  mesh: MeshBuilder
  element: PcbCourtyardPolygon | PcbCourtyardPill
}): void {
  const { mesh, element } = params
  const strokeWidth =
    "stroke_width" in element && typeof element.stroke_width === "number"
      ? element.stroke_width
      : 0.05
  if (element.type === "pcb_courtyard_polygon") {
    if (element.points.length > 0) {
      mesh.path(element.points, strokeWidth, true)
    }
    return
  }
  const rotation =
    "ccw_rotation" in element && typeof element.ccw_rotation === "number"
      ? element.ccw_rotation
      : 0
  const pillRadius =
    element.radius ?? Math.min(element.width, element.height) / 2
  const points = rectangle(
    element.center,
    element.width,
    element.height,
    pillRadius,
    rotation,
  )
  mesh.path(points, strokeWidth, true)
}
