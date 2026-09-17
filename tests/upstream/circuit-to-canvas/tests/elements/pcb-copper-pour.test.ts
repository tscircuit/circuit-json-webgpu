import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbCopperPour } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw rectangular copper pour", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)

  const pour: PcbCopperPour = {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour1",
    shape: "rect",
    layer: "top",
    center: { x: 50, y: 50 },
    width: 60,
    height: 40,
    covered_with_solder_mask: false,
  }

  drawer.drawElements([pour])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})

test("draw polygon copper pour", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)

  const pour: PcbCopperPour = {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour1",
    shape: "polygon",
    layer: "bottom",
    points: [
      { x: 10, y: 10 },
      { x: 90, y: 10 },
      { x: 90, y: 90 },
      { x: 10, y: 90 },
    ],
    covered_with_solder_mask: false,
  }

  drawer.drawElements([pour])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "polygon-copper-pour",
  )
})

test("draw copper pour with trace", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)

  const elements = [
    {
      type: "pcb_copper_pour" as const,
      pcb_copper_pour_id: "pour1",
      shape: "polygon" as const,
      layer: "top" as const,
      points: [
        { x: 10, y: 10 },
        { x: 90, y: 10 },
        { x: 90, y: 90 },
        { x: 10, y: 90 },
      ],
      covered_with_solder_mask: false,
    },
    {
      type: "pcb_trace" as const,
      pcb_trace_id: "trace1",
      route: [
        {
          route_type: "wire" as const,
          x: 20,
          y: 50,
          width: 5,
          layer: "top" as const,
        },
        {
          route_type: "wire" as const,
          x: 80,
          y: 50,
          width: 5,
          layer: "top" as const,
        },
      ],
    },
    {
      type: "pcb_via" as const,
      pcb_via_id: "via1",
      x: 50,
      y: 50,
      outer_diameter: 15,
      hole_diameter: 8,
      layers: ["top", "bottom"] as ("top" | "bottom")[],
    },
  ]

  drawer.drawElements(elements)

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "copper-pour-with-trace",
  )
})

test("draw brep copper pours", async () => {
  const canvas = createCanvas(200, 200)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  // Set camera bounds to fit all elements
  drawer.setCameraBounds({
    minX: -100,
    maxX: 100,
    minY: -50,
    maxY: 50,
  })

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 200, 200)

  const soup: any[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 200,
      height: 100,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    // pour_brep_1: square with rounded-square hole
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_brep_1",
      layer: "top",
      shape: "brep",
      source_net_id: "net1",
      brep_shape: {
        outer_ring: {
          vertices: [
            { x: -30, y: 30 },
            { x: -50, y: 30 },
            { x: -50, y: 10 },
            { x: -30, y: 10 },
          ],
        },
        inner_rings: [
          {
            vertices: [
              { x: -35, y: 25, bulge: 0.5 },
              { x: -45, y: 25 },
              { x: -45, y: 15 },
              { x: -35, y: 15 },
            ],
          },
        ],
      },
    } as PcbCopperPour,
    // pour_brep_2: Bulgy outer ring, two holes
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_brep_2",
      layer: "top",
      shape: "brep",
      source_net_id: "net2",
      brep_shape: {
        outer_ring: {
          vertices: [
            { x: 10, y: 30, bulge: -0.5 },
            { x: -10, y: 30 },
            { x: -10, y: 10, bulge: 0.5 },
            { x: 10, y: 10 },
          ],
        },
        inner_rings: [
          {
            // square hole
            vertices: [
              { x: -5, y: 25 },
              { x: -8, y: 25 },
              { x: -8, y: 22 },
              { x: -5, y: 22 },
            ],
          },
          {
            // triangular hole
            vertices: [
              { x: 5, y: 25 },
              { x: 8, y: 22 },
              { x: 5, y: 22 },
            ],
          },
        ],
      },
    } as PcbCopperPour,
    // pour_brep_3: Circular pour with square hole
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_brep_3",
      layer: "top",
      shape: "brep",
      source_net_id: "net3",
      brep_shape: {
        outer_ring: {
          vertices: [
            { x: 30, y: 20, bulge: 1 },
            { x: 50, y: 20, bulge: 1 },
          ],
        },
        inner_rings: [
          {
            vertices: [
              { x: 38, y: 22 },
              { x: 42, y: 22 },
              { x: 42, y: 18 },
              { x: 38, y: 18 },
            ],
          },
        ],
      },
    } as PcbCopperPour,
    // pour_brep_4: bottom layer pour
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_brep_4",
      layer: "bottom",
      shape: "brep",
      source_net_id: "net4",
      brep_shape: {
        outer_ring: {
          vertices: [
            { x: -30, y: -10 },
            { x: -50, y: -10 },
            { x: -50, y: -30 },
            { x: -30, y: -30, bulge: 0.5 },
          ],
        },
      },
    } as PcbCopperPour,
    // pour_rect_1: A rect pour with rotation
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_rect_1",
      layer: "top",
      shape: "rect",
      source_net_id: "net5",
      center: { x: 0, y: -20 },
      width: 20,
      height: 10,
      rotation: 15,
    } as PcbCopperPour,
    // pour_polygon_1: A polygon pour (triangle)
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_polygon_1",
      layer: "top",
      shape: "polygon",
      source_net_id: "net6",
      points: [
        { x: 30, y: -10 },
        { x: 50, y: -30 },
        { x: 30, y: -30 },
      ],
    } as PcbCopperPour,
  ]

  drawer.drawElements(soup)

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "brep-copper-pours",
  )
})
