import earcut from "earcut"
import {
  flattenPolygon,
  type PolygonTriangulation,
} from "./triangulate-polygon"
import type { Point } from "./types"

const MIN_CACHED_VERTICES = 2048
const MAX_CACHED_BYTES = 24 * 1024 * 1024

type CopperPourGeometryKey = string
type CachedTriangulation = {
  key: CopperPourGeometryKey
  points: Float64Array
  holes: Uint32Array
  triangles: Uint32Array
  byteLength: number
}

function haveSameCoordinates(
  current: readonly number[],
  cached: ArrayLike<number>,
): boolean {
  return (
    current.length === cached.length &&
    current.every((coordinate, index) => coordinate === cached[index])
  )
}

/** Reuse expensive index lists while keeping only one compiled GPU scene. */
export class CopperPourTriangulations {
  private readonly entriesByKey = new Map<
    CopperPourGeometryKey,
    Set<CachedTriangulation>
  >()
  private readonly entriesByRecency = new Set<CachedTriangulation>()
  private cachedBytes = 0

  constructor(private readonly maxCachedBytes = MAX_CACHED_BYTES) {}

  triangulate = (rings: Point[][]): PolygonTriangulation | undefined => {
    const polygon = flattenPolygon(rings)
    if (!polygon) return
    const { points, holes } = polygon
    if (points.length < MIN_CACHED_VERTICES * 2) {
      return { points, triangles: earcut(points, holes, 2) }
    }

    // This key narrows the lookup. Matching also requires every vertex and
    // hole offset, since variants can repour a region with the same outline.
    const key = `${points.length}:${holes.length}:${points[0]}:${points[1]}:${points.at(-2)}:${points.at(-1)}`
    const candidates = this.entriesByKey.get(key)
    if (candidates) {
      for (const cached of candidates) {
        if (
          haveSameCoordinates(points, cached.points) &&
          haveSameCoordinates(holes, cached.holes)
        ) {
          this.entriesByRecency.delete(cached)
          this.entriesByRecency.add(cached)
          return cached
        }
      }
    }

    const triangles = earcut(points, holes, 2)
    const byteLength =
      points.length * Float64Array.BYTES_PER_ELEMENT +
      (holes.length + triangles.length) * Uint32Array.BYTES_PER_ELEMENT
    if (byteLength > this.maxCachedBytes) return { points, triangles }

    for (const oldest of this.entriesByRecency) {
      if (this.cachedBytes + byteLength <= this.maxCachedBytes) break
      this.evict(oldest)
    }
    const triangulation = {
      key,
      points: Float64Array.from(points),
      holes: Uint32Array.from(holes),
      triangles: Uint32Array.from(triangles),
      byteLength,
    }
    const bucket = this.entriesByKey.get(key) ?? new Set<CachedTriangulation>()
    bucket.add(triangulation)
    this.entriesByKey.set(key, bucket)
    this.entriesByRecency.add(triangulation)
    this.cachedBytes += byteLength
    return triangulation
  }

  private evict(triangulation: CachedTriangulation) {
    this.entriesByRecency.delete(triangulation)
    const bucket = this.entriesByKey.get(triangulation.key)
    bucket?.delete(triangulation)
    if (bucket?.size === 0) this.entriesByKey.delete(triangulation.key)
    this.cachedBytes -= triangulation.byteLength
  }
}
