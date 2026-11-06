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

test("reuses distinct copper pours that share a lookup key", () => {
  const triangulations = new CopperPourTriangulations()
  const fullPour = createCopperPour()
  const changedPour = structuredClone(fullPour)
  // This change leaves the lookup key the same but changes the clearance.
  changedPour[1][1].x = -2

  const fullTriangulation = triangulations.triangulate(fullPour)!
  const changedTriangulation = triangulations.triangulate(changedPour)!
  const uncachedTriangulation = triangulatePolygon(changedPour)!
  expect(changedTriangulation).not.toBe(fullTriangulation)
  expect(Array.from(changedTriangulation.points)).toEqual(
    uncachedTriangulation.points,
  )
  expect(Array.from(changedTriangulation.triangles)).toEqual(
    uncachedTriangulation.triangles,
  )
  expect(triangulations.triangulate(structuredClone(fullPour))).toBe(
    fullTriangulation,
  )
  expect(triangulations.triangulate(structuredClone(changedPour))).toBe(
    changedTriangulation,
  )

  const limitedTriangulations = new CopperPourTriangulations(160_000)
  const cachedFull = limitedTriangulations.triangulate(fullPour)
  const cachedChanged = limitedTriangulations.triangulate(changedPour)
  const thirdPour = structuredClone(fullPour)
  thirdPour[1][1].x = -3

  expect(limitedTriangulations.triangulate(fullPour)).toBe(cachedFull)
  const cachedThird = limitedTriangulations.triangulate(thirdPour)
  expect(limitedTriangulations.triangulate(fullPour)).toBe(cachedFull)
  expect(limitedTriangulations.triangulate(thirdPour)).toBe(cachedThird)
  expect(limitedTriangulations.triangulate(changedPour)).not.toBe(cachedChanged)
})
