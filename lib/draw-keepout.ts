import type { MeshBuilder } from "./geometry"
import { triangulatePolygon } from "./triangulate-polygon"
import type { Color, Point } from "./types"

/** Clip a triangle to one side of a diagonal stripe in board coordinates. */
function clip(points: Point[], offset: number, above: boolean): Point[] {
  const result: Point[] = []
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length]
    const da = a.x + a.y - offset,
      db = b.x + b.y - offset
    const insideA = above ? da >= 0 : da <= 0
    const insideB = above ? db >= 0 : db <= 0
    if (insideA) result.push(a)
    if (insideA !== insideB) {
      const t = da / (da - db)
      result.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) })
    }
  }
  return result
}

/** Retained, clipped hatching: 1 mm spacing and 0.15 mm line width. */
export function drawKeepout(mesh: MeshBuilder, rings: Point[][]) {
  const triangulation = triangulatePolygon(rings)
  if (!triangulation) return
  const copperColor = mesh.color
  // A lighter copper color keeps the marking legible over both copper and voids.
  const color: Color = [
    copperColor[0] + (1 - copperColor[0]) * 0.4,
    copperColor[1] + (1 - copperColor[1]) * 0.4,
    copperColor[2] + (1 - copperColor[2]) * 0.4,
    copperColor[3],
  ]
  mesh.color = [color[0], color[1], color[2], color[3] * 0.2]
  mesh.polygon(rings)
  mesh.color = color

  // Clip in board coordinates before rounding to the GPU vertex format.
  const { points, triangles } = triangulation
  const halfWidth = (0.15 * Math.SQRT2) / 2
  for (let i = 0; i < triangles.length; i += 3) {
    const triangle = triangles.slice(i, i + 3).map((index) => ({
      x: points[index * 2],
      y: points[index * 2 + 1],
    }))
    const offsets = triangle.map((p) => p.x + p.y)
    const start = Math.ceil(Math.min(...offsets) - halfWidth)
    const end = Math.floor(Math.max(...offsets) + halfWidth)
    for (let offset = start; offset <= end; offset++) {
      mesh.polygon([
        clip(
          clip(triangle, offset - halfWidth, true),
          offset + halfWidth,
          false,
        ),
      ])
    }
  }
  mesh.color = copperColor
}
