import earcut from "earcut"
import type { Point } from "./types"

export type PolygonTriangulation = {
  points: ArrayLike<number>
  triangles: ArrayLike<number>
}

export function flattenPolygon(rings: Point[][]) {
  if (!rings[0] || rings[0].length < 3) return
  const points: number[] = []
  const holes: number[] = []
  for (const [index, ring] of rings.entries()) {
    if (index > 0) holes.push(points.length / 2)
    for (const point of ring) {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        throw new Error("Non-finite polygon vertex")
      }
      points.push(point.x, point.y)
    }
  }
  return { points, holes }
}

export function triangulatePolygon(rings: Point[][]) {
  const polygon = flattenPolygon(rings)
  if (!polygon) return
  return {
    points: polygon.points,
    triangles: earcut(polygon.points, polygon.holes, 2),
  }
}
