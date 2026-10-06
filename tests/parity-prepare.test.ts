import assert from "node:assert/strict"
import { test, expect } from "bun:test"
import { prepareComparison } from "./parity/prepare.ts"
import { prepareSvgElements } from "./parity/svg-reference"
import type { AnyCircuitElement } from "circuit-json"
const fixture = {
  width: 400,
  height: 200,
  matrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
  contextTransform: { a: 4, b: 0, c: 0, d: 4, e: 0, f: 0 },
  options: {},
  elements: [
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad",
      shape: "rect",
      x: 50,
      y: 25,
      width: 5,
      height: 5,
      layer: "top",
    },
  ],
}
test("SVG and WebGPU share one viewport and canonical y-up camera", () => {
  const { scene } = prepareComparison(fixture)
  assert(scene)
  expect(scene.elements).toBe(fixture.elements)
  expect(scene.viewport).toEqual({ minX: 0, maxX: 100, minY: 0, maxY: 50 })
  expect(scene.transform).toEqual({ a: 4, b: 0, c: 0, d: -4, e: 0, f: 200 })
  expect(scene.background).toBe("#000000")
})
test("layer filtering supplies the same subset to both renderers", () => {
  const top = {
      type: "pcb_silkscreen_text",
      layer: "top",
      text: "Top",
      anchor_position: { x: 0, y: 0 },
    },
    bottom = { ...top, layer: "bottom", text: "Bottom" }
  const { scene } = prepareComparison({
    ...fixture,
    elements: [top, bottom, ...fixture.elements],
    options: { layers: ["top_silkscreen"] },
  })
  assert(scene)
  expect(scene.elements).toEqual([top])
  expect(scene.layer).toBe("top")
  expect(scene.layers).toContain("top_silkscreen")
})
test("Canvas-only passes are not mislabeled as SVG comparisons", () => {
  for (const extra of [
    { primitive: { shape: "circle" } },
    { sourceFunction: "drawPcbTrace" },
    { options: { clipContextElements: [] } },
    { options: { layers: ["top_soldermask"] } },
    { options: { layers: ["bottom_copper", "top_user_note"] } },
  ])
    expect(prepareComparison({ ...fixture, ...extra }).reason).toBeTruthy()
})

test("soldermask-enabled copper views include the corresponding GPU mask layer", () => {
  for (const side of ["top", "bottom"]) {
    const { scene } = prepareComparison({
      ...fixture,
      options: {
        layers: [`${side}_copper`],
        drawSoldermask: true,
        drawSoldermaskTop: side === "top",
        drawSoldermaskBottom: side === "bottom",
      },
    })
    assert(scene)
    expect(scene.showSolderMask).toBe(true)
    expect(scene.layers).toContain(`soldermask_${side}`)
    expect(scene.layers).toContain("drill")
    const maskOff = prepareComparison({
      ...fixture,
      options: { layers: [`${side}_copper`], drawSoldermask: false },
    }).scene!
    expect(maskOff.layers).not.toContain(`soldermask_${side}`)
  }
})

test("comparison preserves Canvas soldermask defaults and per-side opt-outs", () => {
  for (const options of [
    {},
    { drawSoldermask: false, drawSoldermaskTop: true },
    { drawSoldermask: true, drawSoldermaskTop: false },
    { drawSoldermask: true, layers: ["bottom_copper"] },
    {
      drawSoldermask: true,
      drawSoldermaskTop: false,
      drawSoldermaskBottom: true,
      layers: ["top_copper"],
    },
    { drawSoldermask: true, layers: ["inner1_copper"] },
  ]) {
    const { scene } = prepareComparison({ ...fixture, options })
    assert(scene)
    expect(scene.showSolderMask).toBe(false)
    expect(scene.layers ?? []).not.toContain("soldermask_top")
    expect(scene.layers ?? []).not.toContain("soldermask_bottom")
  }
  const top = prepareComparison({
    ...fixture,
    options: { drawSoldermask: true },
  }).scene!
  expect(top.showSolderMask).toBe(true)
  const bottom = prepareComparison({
    ...fixture,
    options: {
      drawSoldermask: true,
      drawSoldermaskTop: false,
      drawSoldermaskBottom: true,
    },
  }).scene!
  expect(bottom.layer).toBe("bottom")
  expect(bottom.showSolderMask).toBe(true)
})

test("SVG reference expands route vias without changing the WebGPU input", () => {
  const elements = [
    {
      type: "pcb_via",
      pcb_via_id: "top-blind",
      x: 0,
      y: 0,
      layers: ["top", "inner1"],
      hole_diameter: 0.3,
      outer_diameter: 0.6,
      tented_on_top: false,
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "bottom-route",
      route: [
        { route_type: "wire", x: -2, y: 0, width: 0.2, layer: "bottom" },
        {
          route_type: "via",
          x: 0,
          y: 0,
          from_layer: "bottom",
          to_layer: "inner2",
          hole_diameter: 0.4,
          outer_diameter: 0.8,
          tented_on_bottom: true,
        },
      ],
    },
  ] satisfies AnyCircuitElement[]
  const original = structuredClone(elements)
  const svgElements = prepareSvgElements(elements)
  expect(elements).toEqual(original)
  expect(elements).toHaveLength(2)
  expect(svgElements).toHaveLength(3)
  expect(svgElements[2]).toMatchObject({
    type: "pcb_via",
    layers: ["bottom", "inner2"],
    x: 0,
    y: 0,
    hole_diameter: 0.4,
    outer_diameter: 0.8,
    tented_on_bottom: true,
    pcb_trace_id: "bottom-route",
  })
  // The already expanded standalone via must suppress a duplicate next time.
  expect(prepareSvgElements(svgElements)).toHaveLength(3)
})
