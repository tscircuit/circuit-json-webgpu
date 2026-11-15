import { expect, test } from "bun:test"
import { any_circuit_element } from "circuit-json"
import { compileCircuitJson, DEFAULT_LAYER_COLORS } from "../lib"
import type { CircuitJson, Mesh } from "../lib"
import { courtyardElements, courtyardRow } from "./fixtures/courtyards"
import { meshBounds, meshCovers } from "./fixtures/mesh-geometry"

// Repro-only PR: keep known gaps executable without breaking ordinary CI.
// COURTYARD_REPRO_STRICT=1 bun test tests/courtyard-support.test.ts
// runs the same desired-behavior assertions as ordinary failing tests.
const knownGap =
  process.env.COURTYARD_REPRO_STRICT === "1" ? test : test.failing

function compileCourtyard(element: CircuitJson[number]) {
  const scene = compileCircuitJson([element])
  expect(scene.diagnostics).toEqual([])
  expect(scene.layers).toHaveLength(1)
  const layer = scene.layers[0]
  expect(layer.name).toBe(
    `${"layer" in element ? element.layer : ""}_courtyard`,
  )
  expect(layer.erase.indices.length).toBe(0)
  expect(layer.paint.indices.length).toBeGreaterThan(0)
  expect([...layer.paint.vertices].every(Number.isFinite)).toBe(true)
  return layer.paint
}

function expectColor(mesh: Mesh, color: readonly number[]) {
  const expected = [...new Float32Array(color)]
  for (let i = 0; i < mesh.vertices.length; i += 8)
    expect([...mesh.vertices.slice(i + 2, i + 6)]).toEqual(expected)
}

test("all five courtyard types have valid, distinct top and bottom fixtures", () => {
  expect(courtyardElements).toHaveLength(10)
  expect(new Set(courtyardElements.map((e) => e.type)).size).toBe(5)
  for (const element of courtyardElements)
    expect(any_circuit_element.parse(element)).toEqual(element)
})

for (const layer of ["top", "bottom"] as const) {
  const [rect, circle, outline, polygon, pill] = courtyardRow(layer)
  const y = rect.center.y
  const color =
    layer === "top"
      ? [34 / 255, 204 / 255, 136 / 255, 1]
      : [1, 187 / 255, 68 / 255, 1]

  test(`${layer} courtyard rect preserves translation, dimensions and rotation`, () => {
    const mesh = compileCourtyard({ ...rect, color: undefined })
    const [minX, maxX, minY, maxY] = meshBounds(mesh)
    expect((minX + maxX) / 2).toBeCloseTo(-8, 3)
    expect((minY + maxY) / 2).toBeCloseTo(y, 3)
    expect(maxX - minX).toBeCloseTo(3 * Math.cos(Math.PI / 6) + 1 + 0.05, 2)
    expect(maxY - minY).toBeCloseTo(1.5 + 2 * Math.cos(Math.PI / 6) + 0.05, 2)
    expect(meshCovers({ mesh, point: rect.center })).toBe(false)
    expectColor(mesh, DEFAULT_LAYER_COLORS[`${layer}_courtyard`])
  })

  test(`${layer} courtyard circle preserves center, radius and empty interior`, () => {
    const mesh = compileCourtyard({ ...circle, color: undefined })
    const [minX, maxX, minY, maxY] = meshBounds(mesh)
    expect((minX + maxX) / 2).toBeCloseTo(-4, 3)
    expect((minY + maxY) / 2).toBeCloseTo(y, 3)
    expect(maxX - minX).toBeCloseTo(2.45, 2)
    expect(maxY - minY).toBeCloseTo(2.45, 2)
    expect(meshCovers({ mesh, point: circle.center })).toBe(false)
    expectColor(mesh, DEFAULT_LAYER_COLORS[`${layer}_courtyard`])
  })

  test(`${layer} courtyard outline closes its boundary without filling it`, () => {
    const mesh = compileCourtyard(outline)
    expect(meshCovers({ mesh, point: { x: -1.5, y } })).toBe(true)
    expect(meshCovers({ mesh, point: { x: 0, y } })).toBe(false)
    expectColor(mesh, DEFAULT_LAYER_COLORS[`${layer}_courtyard`])
  })

  for (const element of [rect, circle])
    knownGap(`${layer} ${element.type} honors its explicit color`, () => {
      expectColor(compileCourtyard(element), color)
    })

  knownGap(
    `${layer} courtyard polygon draws a closed, colored boundary`,
    () => {
      const mesh = compileCourtyard(polygon)
      expect(meshCovers({ mesh, point: { x: 2.5, y } })).toBe(true)
      expect(meshCovers({ mesh, point: { x: 4, y } })).toBe(false)
      expectColor(mesh, color)
    },
  )

  knownGap(
    `${layer} courtyard pill honors dimensions, radius and color`,
    () => {
      const mesh = compileCourtyard(pill)
      expect(meshBounds(mesh)).toEqual(
        [6.475, 9.525, y - 1.025, y + 1.025].map((v) => expect.closeTo(v, 2)),
      )
      expect(meshCovers({ mesh, point: pill.center })).toBe(false)
      // A custom 0.35 mm radius must not become a fixed semicircular end.
      const inset = pill.radius * (1 - Math.SQRT1_2)
      expect(
        meshCovers({ mesh, point: { x: 6.5 + inset, y: y + 1 - inset } }),
      ).toBe(true)
      expectColor(mesh, color)
    },
  )
}
