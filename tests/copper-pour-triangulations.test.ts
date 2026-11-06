import { expect, test } from "bun:test"
import { CopperPourTriangulations } from "../lib/copper-pour-triangulations"
import { triangulatePolygon } from "../lib/triangulate-polygon"
import type { Point } from "../lib/types"

function createCopperPour(): Point[][] {
  const outline = Array.from({ length: 2048 }, (_, index) => {
    const angleRadians = (index * 2 * Math.PI) / 2048
    return { x: 10 * Math.cos(angleRadians), y: 10 * Math.sin(angleRadians) }
  })
  return [
    outline,
    [
      { x: -1, y: -1 },
      { x: -1, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: -1 },
    ],
  ]
}

test("reuses a previous copper pour only when its complete geometry matches", () => {
  const triangulations = new CopperPourTriangulations()
  const fullPour = createCopperPour()
  const minimalPour = structuredClone(fullPour)
  minimalPour[1][3].x = 2

  const fullTriangulation = triangulations.triangulate(fullPour)
  triangulations.triangulate(minimalPour)
  expect(triangulations.triangulate(structuredClone(fullPour))).toBe(
    fullTriangulation,
  )

  // This change leaves the lookup key the same but changes the clearance.
  const changedPour = structuredClone(fullPour)
  changedPour[1][1].x = -2
  const changedTriangulation = triangulations.triangulate(changedPour)!
  const uncachedTriangulation = triangulatePolygon(changedPour)!
  expect(changedTriangulation).not.toBe(fullTriangulation)
  expect(Array.from(changedTriangulation.points)).toEqual(
    uncachedTriangulation.points,
  )
  expect(Array.from(changedTriangulation.triangles)).toEqual(
    uncachedTriangulation.triangles,
  )

  const limitedTriangulations = new CopperPourTriangulations(80_000)
  const oldest = limitedTriangulations.triangulate(fullPour)
  const newest = limitedTriangulations.triangulate(minimalPour)
  expect(limitedTriangulations.triangulate(minimalPour)).toBe(newest)
  expect(limitedTriangulations.triangulate(fullPour)).not.toBe(oldest)
})
