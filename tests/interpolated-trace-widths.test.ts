import { pcb_trace } from "circuit-json"
import { expect, test } from "bun:test"
import { compileCircuitJson } from "../lib"
import { area, meshBounds, meshCovers } from "./fixtures/mesh-geometry"
import { interpolatedTrace } from "./fixtures/interpolated-trace"

test("interpolated traces use both vertex widths with flat ends and no duplicate stroke", () => {
  expect(pcb_trace.safeParse(interpolatedTrace).success).toBe(true)
  const original = structuredClone(interpolatedTrace)
  for (const route of [
    interpolatedTrace.route,
    [...interpolatedTrace.route].reverse(),
  ]) {
    const scene = compileCircuitJson([{ ...interpolatedTrace, route }])
    expect(scene.diagnostics).toEqual([])
    expect(scene.elementIds).toEqual(["interpolated"])
    expect(scene.triangleCount).toBe(2)
    const mesh = scene.layers.find((layer) => layer.name === "top")!.paint
    expect(area(mesh)).toBeCloseTo(8)
    expect(meshBounds(mesh)).toEqual([0, 4, -1.5, 1.5])
    // Half-width grows from 0.5 to 1.5: it is 0.75 at x=1 and 1.25 at x=3.
    expect(meshCovers({ mesh, point: { x: 1, y: 0.8 } })).toBe(false)
    expect(meshCovers({ mesh, point: { x: 3, y: 1 } })).toBe(true)
    expect(
      [...mesh.vertices]
        .filter((_, i) => i % 8 === 6)
        .every((index) => index === 0),
    ).toBe(true)
  }
  expect(interpolatedTrace).toEqual(original)
  const constant = compileCircuitJson([
    { ...interpolatedTrace, route_thickness_mode: "constant" },
  ])
  expect(area(constant.layers[0].paint)).toBeCloseTo(4 + Math.PI / 4, 1)
})
