import { expect, test } from "bun:test"
import type { PcbVia } from "circuit-json"
import { compileCircuitJson } from "../lib"
import { ellipse } from "../lib/geometry"
import { MAX_ARC_CHORD_ERROR_MM } from "../lib/get-arc-segment-count"

const SITARA_VIA_COUNT = 256

const createSitaraVias = (): PcbVia[] =>
  Array.from({ length: SITARA_VIA_COUNT }, (_, index) => ({
    type: "pcb_via",
    pcb_via_id: `pcb_via_${index}`,
    x: index % 16,
    y: Math.floor(index / 16),
    hole_diameter: 0.2032,
    outer_diameter: 0.4572,
    layers: ["top", "inner1", "inner2", "inner3", "inner4", "bottom"],
    from_layer: "top",
    to_layer: "bottom",
  }))

test("TMDS62LEVM-sized vias compile to a bounded mesh", () => {
  const scene = compileCircuitJson(createSitaraVias())
  const vertexBytes = scene.layers.reduce(
    (byteCount, layer) =>
      byteCount +
      layer.paint.vertices.byteLength +
      layer.erase.vertices.byteLength,
    0,
  )

  expect(scene.diagnostics).toEqual([])
  expect(vertexBytes).toBeLessThan(6_000_000)
})

test("adaptive circle tessellation stays within the physical error bound", () => {
  const diameterMm = 0.4572
  const radiusMm = diameterMm / 2
  const points = ellipse({ x: 0, y: 0 }, diameterMm)

  for (let index = 0; index < points.length; index++) {
    const point = points[index]
    const nextPoint = points[(index + 1) % points.length]
    const midpointRadiusMm = Math.hypot(
      (point.x + nextPoint.x) / 2,
      (point.y + nextPoint.y) / 2,
    )

    expect(radiusMm - midpointRadiusMm).toBeLessThanOrEqual(
      MAX_ARC_CHORD_ERROR_MM,
    )
  }
})
