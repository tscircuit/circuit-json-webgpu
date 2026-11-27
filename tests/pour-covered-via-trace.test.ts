import { expect, test } from "bun:test"
import { compileCircuitJson, type CircuitJson } from "../lib"
import { POUR_COVERED_TRACE_CATEGORY } from "../lib/geometry"

const coverage = {
  is_inside_copper_pour: true,
  copper_pour_id: "pour",
} as const
const wire = {
  route_type: "wire",
  x: -1,
  y: 0,
  width: 0.2,
  layer: "top",
  ...coverage,
} as const
const via = {
  route_type: "via",
  x: 1,
  y: 0,
  from_layer: "top",
  to_layer: "bottom",
  ...coverage,
} as const
const pour = {
  type: "pcb_copper_pour",
  pcb_copper_pour_id: "pour",
  shape: "rect",
  layer: "top",
  center: { x: 0, y: 0 },
  width: 4,
  height: 2,
  covered_with_solder_mask: true,
} as const

test("pour-covered trace segments connected to vias are tagged in both directions", () => {
  for (const route of [
    [wire, via],
    [via, wire],
  ]) {
    const scene = compileCircuitJson([
      {
        type: "pcb_trace",
        pcb_trace_id: "covered-via-trace",
        route,
      },
      pour,
    ] as CircuitJson)
    expect(scene.diagnostics).toEqual([])
    const { vertices, indices } = scene.layers.find(
      (layer) => layer.name === "top",
    )!.paint
    const traceIndices = indices.filter(
      (index) => vertices[index * 8 + 6] === 0,
    )
    expect(traceIndices.length).toBeGreaterThan(0)
    expect(
      new Set(Array.from(traceIndices, (index) => vertices[index * 8 + 7])),
    ).toEqual(new Set([POUR_COVERED_TRACE_CATEGORY]))
  }
})
