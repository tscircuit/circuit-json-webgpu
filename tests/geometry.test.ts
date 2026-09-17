import { expect, test } from "bun:test"
import { compileCircuitJson } from "../lib"
import {
  ellipse,
  expandBrepRing,
  MeshBuilder,
  rectangle,
} from "../lib/geometry"
import { fixtures } from "../site/fixtures"
import large from "./fixtures/am3352-dev-board.circuit.json"

function area(mesh: ReturnType<MeshBuilder["build"]>) {
  let area = 0
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const [a, b, c] = [...mesh.indices.slice(i, i + 3)].map((j) => ({
      x: mesh.vertices[j * 8],
      y: mesh.vertices[j * 8 + 1],
    }))
    area += Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2
  }
  return area
}
test("triangulation preserves polygon holes", () => {
  const mesh = new MeshBuilder()
  mesh.polygon([
    rectangle({ x: 0, y: 0 }, 10, 10),
    rectangle({ x: 0, y: 0 }, 4, 4),
  ])
  expect(area(mesh.build())).toBeCloseTo(84)
})
test("rounded and rotated pads retain their areas", () => {
  const mesh = new MeshBuilder()
  mesh.polygon([rectangle({ x: 2, y: 3 }, 8, 4, 2, 37)])
  expect(area(mesh.build())).toBeCloseTo(16 + Math.PI * 4, 1)
})
test("bulge arcs expand in the correct direction", () => {
  const ring = expandBrepRing([
    { x: -1, y: 0, bulge: 1 },
    { x: 1, y: 0 },
  ])
  expect(Math.min(...ring.map((p) => p.y))).toBeCloseTo(-1)
  expect(Math.max(...ring.map((p) => p.y))).toBe(0)
})
test("circle tessellation has finite coordinates and correct area", () => {
  const mesh = new MeshBuilder()
  mesh.polygon([ellipse({ x: 0, y: 0 }, 4)])
  expect(area(mesh.build())).toBeCloseTo(Math.PI * 4, 1)
})
for (const [name, fixture] of Object.entries(fixtures))
  test(`compiles ${name} without missing geometry`, () => {
    const scene = compileCircuitJson(fixture.elements)
    expect(scene.diagnostics).toEqual([])
    expect(scene.triangleCount).toBeGreaterThan(0)
    for (const layer of scene.layers)
      for (const mesh of [layer.paint, layer.erase]) {
        expect([...mesh.vertices].every(Number.isFinite)).toBe(true)
        expect(
          [...mesh.indices].every((i) => i < mesh.vertices.length / 8),
        ).toBe(true)
      }
  })
test("reports unsupported shapes instead of silently hiding them", () => {
  const scene = compileCircuitJson([
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "bad",
      layer: "top",
      shape: "future_shape",
    },
  ] as any)
  expect(scene.diagnostics[0].elementId).toBe("bad")
})
test("AM3352 compiles without unsupported PCB geometry", () => {
  const scene = compileCircuitJson(large as any)
  expect(scene.diagnostics).toEqual([])
  expect(scene.triangleCount).toBeGreaterThan(100000)
})

test("wire-to-via segments stay on the adjacent layer without bridging other runs", () => {
  const scene = compileCircuitJson([
    {
      type: "pcb_trace",
      pcb_trace_id: "transition",
      route: [
        { route_type: "wire", x: 0, y: 0, width: 1, layer: "top" },
        {
          route_type: "via",
          x: 5,
          y: 0,
          from_layer: "top",
          to_layer: "bottom",
        },
        { route_type: "wire", x: 10, y: 0, width: 1, layer: "bottom" },
        { route_type: "wire", x: 100, y: 0, width: 1, layer: "inner1" },
      ],
    },
  ] as any)
  expect(scene.layers.map((l) => l.name).sort()).toEqual(["bottom", "top"])
  expect(area(scene.layers.find((l) => l.name === "top")!.paint)).toBeCloseTo(
    5 + Math.PI / 4,
    1,
  )
})
