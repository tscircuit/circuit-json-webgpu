import { expect, test } from "bun:test"
import { compileCircuitJson } from "../lib"
import { meshBounds, meshCovers } from "./fixtures/mesh-geometry"
import { interpolatedTrace } from "./fixtures/interpolated-trace"

test("interpolated runs stop at layer changes and preserve via and through-pad connectors", () => {
  for (const transition of [
    {
      route_type: "via" as const,
      x: 6,
      y: 0,
      from_layer: "top" as const,
      to_layer: "bottom" as const,
    },
    {
      route_type: "through_pad" as const,
      start: { x: 5, y: 0 },
      end: { x: 7, y: 0 },
      start_layer: "top" as const,
      end_layer: "bottom" as const,
      width: 1,
    },
  ]) {
    const scene = compileCircuitJson([
      {
        ...interpolatedTrace,
        route: [
          ...interpolatedTrace.route,
          transition,
          { ...interpolatedTrace.route[0], x: 10, layer: "bottom" },
          { ...interpolatedTrace.route[1], x: 14, layer: "bottom" },
          { ...interpolatedTrace.route[0], x: 100, layer: "inner1" },
        ],
      },
    ])
    expect(scene.diagnostics).toEqual([])
    expect(scene.layers.map((layer) => layer.name).sort()).toEqual([
      "bottom",
      "top",
    ])
    const top = scene.layers.find((layer) => layer.name === "top")!.paint
    const bottom = scene.layers.find((layer) => layer.name === "bottom")!.paint
    // Sample the gaps between each interpolated run and the transition anchor.
    expect(meshCovers({ mesh: top, point: { x: 4.5, y: 0 } })).toBe(true)
    expect(meshCovers({ mesh: bottom, point: { x: 9, y: 0 } })).toBe(true)
    if (transition.route_type === "through_pad") {
      expect(meshCovers({ mesh: top, point: { x: 6, y: 0 } })).toBe(true)
      expect(meshCovers({ mesh: bottom, point: { x: 6, y: 0 } })).toBe(true)
    }
    expect(
      meshBounds(scene.layers.find((layer) => layer.name === "top")!.paint)[1],
    ).toBeLessThan(9)
    expect(
      meshBounds(
        scene.layers.find((layer) => layer.name === "bottom")!.paint,
      )[1],
    ).toBe(14)
  }
})
