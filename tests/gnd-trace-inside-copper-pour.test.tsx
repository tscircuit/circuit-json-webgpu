import { expect, test } from "bun:test"
import { compileCircuitJson, type CircuitJson } from "../lib"

test("repro: GND trace remains visible inside its copper pour", async () => {
  const circuitJson: CircuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 12,
      height: 8,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "source_net",
      source_net_id: "gnd",
      name: "GND",
      member_source_group_ids: [],
    },
    {
      type: "source_trace",
      source_trace_id: "gnd-connection",
      connected_source_port_ids: [],
      connected_source_net_ids: ["gnd"],
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "gnd-pour",
      source_net_id: "gnd",
      shape: "rect",
      layer: "top",
      center: { x: 0, y: 0 },
      width: 11,
      height: 7,
      covered_with_solder_mask: true,
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "gnd-trace",
      source_trace_id: "gnd-connection",
      route: [
        {
          route_type: "wire",
          x: -4,
          y: 0,
          width: 0.5,
          layer: "top",
          is_inside_copper_pour: true,
          copper_pour_id: "gnd-pour",
        },
        {
          route_type: "wire",
          x: 4,
          y: 0,
          width: 0.5,
          layer: "top",
          is_inside_copper_pour: true,
          copper_pour_id: "gnd-pour",
        },
      ],
    },
  ]
  const scene = compileCircuitJson(circuitJson)
  expect(scene.diagnostics).toEqual([])
  expect(scene.triangleCount).toBeGreaterThan(
    compileCircuitJson(circuitJson.filter((e) => e.type !== "pcb_trace"))
      .triangleCount,
  )
  await Bun.write(
    new URL(
      "./actual/gnd-trace-inside-copper-pour.circuit.json",
      import.meta.url,
    ),
    JSON.stringify(circuitJson, null, 2),
  )
})
