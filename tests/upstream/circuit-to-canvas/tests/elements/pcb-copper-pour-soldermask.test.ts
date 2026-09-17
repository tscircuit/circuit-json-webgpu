import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("render top copper pour with soldermask-over-copper color", async () => {
  const canvas = createCanvas(900, 500)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 900, 500)

  const circuit: AnyCircuitElement[] = [
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_0",
      center: {
        x: -5,
        y: -2,
      },
      width: 2.8499999999999996,
      height: 1.4000000000000001,
      layer: "top",
      rotation: 0,
      source_component_id: "source_component_0",
      subcircuit_id: "subcircuit_source_group_0",
      do_not_place: false,
      obstructs_within_bounds: true,
      position_mode: "relative_to_group_anchor",
      positioned_relative_to_pcb_board_id: "pcb_board_0",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_1",
      center: {
        x: 5,
        y: -2,
      },
      width: 2.8499999999999996,
      height: 1.4000000000000001,
      layer: "top",
      rotation: 0,
      source_component_id: "source_component_1",
      subcircuit_id: "subcircuit_source_group_0",
      do_not_place: false,
      obstructs_within_bounds: true,
      position_mode: "relative_to_group_anchor",
      positioned_relative_to_pcb_board_id: "pcb_board_0",
    },
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: {
        x: 0,
        y: 0,
      },
      thickness: 1.4,
      num_layers: 2,
      width: 20,
      height: 20,
      outline: [
        {
          x: -10,
          y: -10,
        },
        {
          x: 10,
          y: -10,
        },
        {
          x: 10,
          y: 10,
        },
        {
          x: 0,
          y: 10,
        },
        {
          x: 0,
          y: 0,
        },
        {
          x: -10,
          y: 0,
        },
      ],
      material: "fr4",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_0",
      pcb_component_id: "pcb_component_0",
      pcb_port_id: "pcb_port_0",
      layer: "top",
      shape: "rect",
      width: 1.025,
      height: 1.4,
      port_hints: ["1", "left"],
      is_covered_with_solder_mask: false,
      soldermask_margin: 0.5,
      x: -5.9125,
      y: -2,
      subcircuit_id: "subcircuit_source_group_0",
    },
    {
      type: "pcb_solder_paste",
      pcb_solder_paste_id: "pcb_solder_paste_0",
      layer: "top",
      shape: "rect",
      width: 0.7174999999999999,
      height: 0.9799999999999999,
      x: -5.9125,
      y: -2,
      pcb_component_id: "pcb_component_0",
      pcb_smtpad_id: "pcb_smtpad_0",
      subcircuit_id: "subcircuit_source_group_0",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_1",
      pcb_component_id: "pcb_component_0",
      pcb_port_id: "pcb_port_1",
      layer: "top",
      shape: "rect",
      width: 1.025,
      height: 1.4,
      port_hints: ["2", "right"],
      is_covered_with_solder_mask: false,
      soldermask_margin: 0.2,
      x: -4.0875,
      y: -2,
      subcircuit_id: "subcircuit_source_group_0",
    },
    {
      type: "pcb_solder_paste",
      pcb_solder_paste_id: "pcb_solder_paste_1",
      layer: "top",
      shape: "rect",
      width: 0.7174999999999999,
      height: 0.9799999999999999,
      x: -4.0875,
      y: -2,
      pcb_component_id: "pcb_component_0",
      pcb_smtpad_id: "pcb_smtpad_1",
      subcircuit_id: "subcircuit_source_group_0",
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_0",
      pcb_component_id: "pcb_component_0",
      layer: "top",
      route: [
        {
          x: -4.0875,
          y: -0.8999999999999999,
        },
        {
          x: -6.625,
          y: -0.8999999999999999,
        },
        {
          x: -6.625,
          y: -3.1,
        },
        {
          x: -4.0875,
          y: -3.1,
        },
      ],
      stroke_width: 0.1,
      subcircuit_id: "subcircuit_source_group_0",
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_0",
      anchor_alignment: "center",
      anchor_position: {
        x: -5,
        y: -0.3999999999999999,
      },
      font: "tscircuit2024",
      font_size: 0.4,
      layer: "top",
      text: "R1",
      ccw_rotation: 0,
      pcb_component_id: "pcb_component_0",
      subcircuit_id: "subcircuit_source_group_0",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_2",
      pcb_component_id: "pcb_component_1",
      pcb_port_id: "pcb_port_2",
      layer: "top",
      shape: "rect",
      width: 1.025,
      height: 1.4,
      port_hints: ["1", "left"],
      is_covered_with_solder_mask: false,
      x: 4.0875,
      y: -2,
      subcircuit_id: "subcircuit_source_group_0",
    },
    {
      type: "pcb_solder_paste",
      pcb_solder_paste_id: "pcb_solder_paste_2",
      layer: "top",
      shape: "rect",
      width: 0.7174999999999999,
      height: 0.9799999999999999,
      x: 4.0875,
      y: -2,
      pcb_component_id: "pcb_component_1",
      pcb_smtpad_id: "pcb_smtpad_2",
      subcircuit_id: "subcircuit_source_group_0",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_3",
      pcb_component_id: "pcb_component_1",
      pcb_port_id: "pcb_port_3",
      layer: "top",
      shape: "rect",
      width: 1.025,
      height: 1.4,
      port_hints: ["2", "right"],
      is_covered_with_solder_mask: false,
      x: 5.9125,
      y: -2,
      subcircuit_id: "subcircuit_source_group_0",
    },
    {
      type: "pcb_solder_paste",
      pcb_solder_paste_id: "pcb_solder_paste_3",
      layer: "top",
      shape: "rect",
      width: 0.7174999999999999,
      height: 0.9799999999999999,
      x: 5.9125,
      y: -2,
      pcb_component_id: "pcb_component_1",
      pcb_smtpad_id: "pcb_smtpad_3",
      subcircuit_id: "subcircuit_source_group_0",
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_1",
      pcb_component_id: "pcb_component_1",
      layer: "top",
      route: [
        {
          x: 5.9125,
          y: -0.8999999999999999,
        },
        {
          x: 3.375,
          y: -0.8999999999999999,
        },
        {
          x: 3.375,
          y: -3.1,
        },
        {
          x: 5.9125,
          y: -3.1,
        },
      ],
      stroke_width: 0.1,
      subcircuit_id: "subcircuit_source_group_0",
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_1",
      anchor_alignment: "center",
      anchor_position: {
        x: 5,
        y: -0.3999999999999999,
      },
      font: "tscircuit2024",
      font_size: 0.4,
      layer: "top",
      text: "R2",
      ccw_rotation: 0,
      pcb_component_id: "pcb_component_1",
      subcircuit_id: "subcircuit_source_group_0",
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_0",
      pcb_component_id: "pcb_component_0",
      layers: ["top"],
      subcircuit_id: "subcircuit_source_group_0",
      x: -5.9125,
      y: -2,
      source_port_id: "source_port_0",
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_1",
      pcb_component_id: "pcb_component_0",
      layers: ["top"],
      subcircuit_id: "subcircuit_source_group_0",
      x: -4.0875,
      y: -2,
      source_port_id: "source_port_1",
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_2",
      pcb_component_id: "pcb_component_1",
      layers: ["top"],
      subcircuit_id: "subcircuit_source_group_0",
      x: 4.0875,
      y: -2,
      source_port_id: "source_port_2",
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_3",
      pcb_component_id: "pcb_component_1",
      layers: ["top"],
      subcircuit_id: "subcircuit_source_group_0",
      x: 5.9125,
      y: -2,
      source_port_id: "source_port_3",
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_0",
      position: {
        x: -5,
        y: -2,
        z: 0.7,
      },
      rotation: {
        x: 0,
        y: 0,
        z: 0,
      },
      anchor_alignment: "center",
      pcb_component_id: "pcb_component_0",
      source_component_id: "source_component_0",
      footprinter_string: "0805",
      model_object_fit: "contain_within_bounds",
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_1",
      position: {
        x: 5,
        y: -2,
        z: 0.7,
      },
      rotation: {
        x: 0,
        y: 0,
        z: 0,
      },
      anchor_alignment: "center",
      pcb_component_id: "pcb_component_1",
      source_component_id: "source_component_1",
      footprinter_string: "0805",
      model_object_fit: "contain_within_bounds",
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "source_net_1_mst0_0",
      route: [
        {
          route_type: "wire",
          x: 5.9125,
          y: -2,
          width: 0.15,
          layer: "top",
          start_pcb_port_id: "pcb_port_3",
        },
        {
          route_type: "wire",
          x: 4.0875,
          y: -2,
          width: 0.15,
          layer: "top",
        },
        {
          route_type: "wire",
          x: 4.0875,
          y: -2,
          width: 0.15,
          layer: "top",
          end_pcb_port_id: "pcb_port_2",
        },
      ],
      subcircuit_id: "subcircuit_source_group_0",
      source_trace_id: "source_net_1",
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "source_net_1_mst1_0",
      route: [
        {
          route_type: "wire",
          x: 4.0875,
          y: -2,
          width: 0.15,
          layer: "top",
          start_pcb_port_id: "pcb_port_2",
        },
        {
          route_type: "wire",
          x: -4.0875,
          y: -2,
          width: 0.15,
          layer: "top",
        },
        {
          route_type: "wire",
          x: -4.0875,
          y: -2,
          width: 0.15,
          layer: "top",
          end_pcb_port_id: "pcb_port_1",
        },
      ],
      subcircuit_id: "subcircuit_source_group_0",
      source_trace_id: "source_net_1",
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pcb_copper_pour_0",
      shape: "brep",
      layer: "top",
      brep_shape: {
        outer_ring: {
          vertices: [
            {
              x: -9.8,
              y: -0.1999999999999994,
            },
            {
              x: -0.2,
              y: -0.2,
            },
            {
              x: 0,
              y: -0.2,
            },
            {
              x: 0.2,
              y: -0.2,
            },
            {
              x: 0.20000000000000032,
              y: 1.2246467991473533e-17,
            },
            {
              x: 0.20000000000000032,
              y: 0.2,
            },
            {
              x: 0.1999999999999997,
              y: 9.8,
            },
            {
              x: 9.8,
              y: 9.8,
            },
            {
              x: 9.8,
              y: -9.8,
            },
            {
              x: -9.8,
              y: -9.8,
            },
          ],
        },
        inner_rings: [
          {
            vertices: [
              {
                x: -3.375,
                y: -2.2749999999999995,
              },
              {
                x: 3.375,
                y: -2.2750000000000004,
              },
              {
                x: 3.375,
                y: -2.9000000000000004,
              },
              {
                x: 4.800000000000001,
                y: -2.9000000000000004,
              },
              {
                x: 4.800000000000001,
                y: -2.275,
              },
              {
                x: 5.199999999999999,
                y: -2.275,
              },
              {
                x: 5.199999999999999,
                y: -2.9000000000000004,
              },
              {
                x: 6.625,
                y: -2.9000000000000004,
              },
              {
                x: 6.625,
                y: -1.1,
              },
              {
                x: 5.199999999999999,
                y: -1.1,
              },
              {
                x: 5.199999999999999,
                y: -1.725,
              },
              {
                x: 4.800000000000001,
                y: -1.7249999999999999,
              },
              {
                x: 4.800000000000001,
                y: -1.1,
              },
              {
                x: 3.375,
                y: -1.1,
              },
              {
                x: 3.375,
                y: -1.7250000000000005,
              },
              {
                x: -3.375,
                y: -1.7249999999999996,
              },
              {
                x: -3.375,
                y: -1.1,
              },
              {
                x: -4.800000000000001,
                y: -1.1,
              },
              {
                x: -4.800000000000001,
                y: -2.9000000000000004,
              },
              {
                x: -3.375,
                y: -2.9000000000000004,
              },
            ],
          },
        ],
      },
      source_net_id: "source_net_0",
      subcircuit_id: "subcircuit_source_group_0",
      covered_with_solder_mask: true,
    },
  ]

  drawer.setCameraBounds({ minX: -9, maxX: 9, minY: -5, maxY: 5 })
  drawer.drawElements(circuit, {
    drawSoldermask: true,
    drawSoldermaskTop: true,
    drawSoldermaskBottom: false,
    drawBoardMaterial: true,
  })

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "top-copper-pour-soldermask",
  )
})

test("render bottom copper pour with soldermask-over-copper color", async () => {
  const canvas = createCanvas(900, 500)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 900, 500)

  const circuit: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_bottom_pour_mask",
      center: { x: 0, y: 0 },
      width: 18,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "bottom_pour",
      shape: "polygon",
      layer: "bottom",
      points: [
        { x: -6, y: 3.5 },
        { x: 6, y: 3.5 },
        { x: 6, y: -3.5 },
        { x: -6, y: -3.5 },
      ],
      covered_with_solder_mask: true,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "bottom_opening_pad",
      shape: "rect",
      layer: "bottom",
      x: 2.5,
      y: 0,
      width: 2.2,
      height: 1.2,
      soldermask_margin: 0.2,
    },
  ]

  drawer.setCameraBounds({ minX: -9, maxX: 9, minY: -5, maxY: 5 })
  drawer.drawElements(circuit, {
    drawSoldermask: true,
    drawSoldermaskTop: false,
    drawSoldermaskBottom: true,
    drawBoardMaterial: true,
  })

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "bottom-copper-pour-soldermask",
  )
})
