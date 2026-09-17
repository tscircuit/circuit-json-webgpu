import type { MeshBuilder } from "../geometry"
import type { Point } from "../types"
function contains(ring: Point[], p: Point) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j]
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside
  }
  return inside
}
/** Glyphs may have disconnected rings (i, !, %) as well as nested counters. */
export function fillEvenOdd(mesh: MeshBuilder, rings: Point[][]) {
  const contours = rings
    .filter((r) => r.length >= 3)
    .map((ring) => ({ ring, parents: [] as number[] }))
  for (const [i, c] of contours.entries())
    c.parents = contours.flatMap((other, j) =>
      i !== j && contains(other.ring, c.ring[0]) ? [j] : [],
    )
  for (const [i, c] of contours.entries())
    if (c.parents.length % 2 === 0) {
      const holes = contours.filter(
        (h) =>
          h.parents.length === c.parents.length + 1 && h.parents.includes(i),
      )
      mesh.polygon([c.ring, ...holes.map((h) => h.ring)])
    }
}
