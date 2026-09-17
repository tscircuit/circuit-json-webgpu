import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbPlatedHole, PcbTrace, PcbVia } from "circuit-json"
import { identity } from "transformation-matrix"
import { processTraceSoldermask } from "../../lib/drawer/elements/pcb-soldermask/trace"
import { drawPcbTrace } from "../../lib/drawer/elements/pcb-trace/pcb-trace"
import { DEFAULT_PCB_COLOR_MAP } from "../../lib/drawer/types"

test("cut copper trace at via destination drill", () => {
  const canvas = createCanvas(120, 100)
  const ctx = canvas.getContext("2d")

  ctx.fillStyle = "rgb(16, 16, 16)"
  ctx.fillRect(0, 0, 120, 100)

  const trace: PcbTrace = {
    type: "pcb_trace",
    pcb_trace_id: "trace_with_via_destination",
    route: [
      { route_type: "wire", x: 20, y: 50, width: 18, layer: "top" },
      { route_type: "wire", x: 90, y: 50, width: 18, layer: "top" },
    ],
  }

  const via: PcbVia = {
    type: "pcb_via",
    pcb_via_id: "via_destination",
    x: 90,
    y: 50,
    outer_diameter: 24,
    hole_diameter: 10,
    layers: ["top", "bottom"],
  }

  drawPcbTrace({
    ctx,
    trace,
    realToCanvasMat: identity(),
    colorMap: DEFAULT_PCB_COLOR_MAP,
    vias: [via],
    platedHoles: [],
  })

  const [r, g, b, a] = ctx.getImageData(90, 50, 1, 1).data
  expect(r).toBe(0)
  expect(g).toBe(0)
  expect(b).toBe(0)
  expect(a).toBe(0)
})

test("cut soldermask trace at plated-hole destination drill", () => {
  const canvas = createCanvas(120, 100)
  const ctx = canvas.getContext("2d")

  ctx.fillStyle = "rgb(16, 16, 16)"
  ctx.fillRect(0, 0, 120, 100)

  const trace: PcbTrace = {
    type: "pcb_trace",
    pcb_trace_id: "trace_with_plated_destination",
    route: [
      { route_type: "wire", x: 20, y: 50, width: 18, layer: "top" },
      { route_type: "wire", x: 90, y: 50, width: 18, layer: "top" },
    ],
  }

  const platedHole: PcbPlatedHole = {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "plated_destination",
    shape: "circle",
    x: 90,
    y: 50,
    outer_diameter: 24,
    hole_diameter: 10,
    layers: ["top", "bottom"],
  }

  processTraceSoldermask({
    ctx,
    trace,
    realToCanvasMat: identity(),
    soldermaskOverCopperColor: "rgb(52, 135, 73)",
    layer: "top",
    vias: [],
    platedHoles: [platedHole],
  })

  const [r, g, b, a] = ctx.getImageData(90, 50, 1, 1).data
  expect(r).toBe(0)
  expect(g).toBe(0)
  expect(b).toBe(0)
  expect(a).toBe(0)
})
