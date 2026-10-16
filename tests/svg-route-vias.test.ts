import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import type { PcbTrace, PcbVia } from "circuit-json"

const trace: PcbTrace = {
  type: "pcb_trace",
  pcb_trace_id: "trace",
  route: [
    { route_type: "wire", x: 10, y: 50, width: 2, layer: "bottom" },
    { route_type: "wire", x: 50, y: 50, width: 2, layer: "bottom" },
    {
      route_type: "via",
      x: 50,
      y: 50,
      from_layer: "bottom",
      to_layer: "inner2",
      outer_diameter: 20,
      hole_diameter: 10,
    },
  ],
}
const standalone: PcbVia = {
  type: "pcb_via",
  pcb_via_id: "standalone",
  x: 50,
  y: 50,
  layers: ["top", "inner1"],
  outer_diameter: 20,
  hole_diameter: 10,
}
const render = (elements: (PcbTrace | PcbVia)[]) =>
  convertCircuitJsonToPcbSvg(elements, {
    width: 100,
    height: 100,
    viewport: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
    layer: "bottom",
    showSolderMask: true,
    includeVersion: false,
  })
const circles = (svg: string, kind: "outer" | "inner") =>
  [
    ...svg.matchAll(
      new RegExp(`<circle[^>]*class="pcb-hole-${kind}"[^>]*>`, "g"),
    ),
  ].map(([tag]) => Number(tag.match(/\br="([^"]+)"/)![1]))

test("SVG reference respects explicit route-via diameters independently of wire width", () => {
  const svg = render([trace])
  expect(circles(svg, "outer")).toEqual([10])
  expect(circles(svg, "inner")).toEqual([5])
})

test("SVG reference does not suppress a route via on different layers", () => {
  const svg = render([standalone, trace])
  expect(circles(svg, "outer")).toEqual([10])
  expect(circles(svg, "inner")).toEqual([5])
})

test("SVG reference still deduplicates a standalone via spanning the route layers", () => {
  const svg = render([{ ...standalone, layers: ["bottom", "inner2"] }, trace])
  expect(circles(svg, "outer")).toEqual([10])
  expect(circles(svg, "inner")).toEqual([5])
})
