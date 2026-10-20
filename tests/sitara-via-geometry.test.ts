import { expect, test } from "bun:test"
import type { PcbVia } from "circuit-json"
import { compileCircuitJson } from "../lib"
import { adaptiveCircle, ellipse } from "../lib/geometry"
import { TARGET_CIRCLE_CHORD_ERROR_MM } from "../lib/get-circle-segment-count"

const SITARA_VIA_COUNT = 1024

const createSitaraVias = ({
  viaCount = SITARA_VIA_COUNT,
  layers = ["top", "inner1", "inner2", "inner3", "inner4", "bottom"],
}: {
  viaCount?: number
  layers?: PcbVia["layers"]
} = {}): PcbVia[] =>
  Array.from({ length: viaCount }, (_, index) => ({
    type: "pcb_via",
    pcb_via_id: `pcb_via_${index}`,
    x: index % 16,
    y: Math.floor(index / 16),
    hole_diameter: 0.2032,
    outer_diameter: 0.4572,
    layers,
    from_layer: "top",
    to_layer: "bottom",
  }))

test("TMDS62LEVM-sized vias compile to a bounded mesh", () => {
  const scene = compileCircuitJson(createSitaraVias(), {
    renderViasInHighDetail: false,
  })
  const vertexBytes = scene.layers.reduce(
    (byteCount, layer) =>
      byteCount +
      layer.paint.vertices.byteLength +
      layer.erase.vertices.byteLength,
    0,
  )

  expect(scene.diagnostics).toEqual([])
  expect(vertexBytes).toBeLessThan(24_000_000)
})

test("via scenes retain full-resolution geometry by default", () => {
  const viaCount = 513
  const scene = compileCircuitJson(
    createSitaraVias({ viaCount, layers: ["top"] }),
  )
  const topLayer = scene.layers.find((layer) => layer.name === "top")

  expect(topLayer?.paint.indices.length).toBe(viaCount * (96 - 2) * 3)
  expect(topLayer?.erase.indices.length).toBe(viaCount * (96 - 2) * 3)
})

test("adaptive circles target physical error without exceeding legacy resolution", () => {
  const diameterMm = 0.4572
  const radiusMm = diameterMm / 2
  const points = adaptiveCircle({
    center: { x: 0, y: 0 },
    diameterMm,
  })

  expect(points.length).toBeLessThan(ellipse({ x: 0, y: 0 }, diameterMm).length)

  for (let index = 0; index < points.length; index++) {
    const point = points[index]
    const nextPoint = points[(index + 1) % points.length]
    const midpointRadiusMm = Math.hypot(
      (point.x + nextPoint.x) / 2,
      (point.y + nextPoint.y) / 2,
    )

    expect(radiusMm - midpointRadiusMm).toBeLessThanOrEqual(
      TARGET_CIRCLE_CHORD_ERROR_MM,
    )
  }

  expect(
    adaptiveCircle({ center: { x: 0, y: 0 }, diameterMm: 10 }),
  ).toHaveLength(96)
})
