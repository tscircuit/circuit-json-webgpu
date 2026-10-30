import { expect, test } from "bun:test"
import { compileCircuitJson } from "../lib"
import type { CircuitJson } from "../lib"
import { meshCovers } from "./fixtures/mesh-geometry"

for (const renderViasInHighDetail of [true, false]) {
  for (const span of [
    { layers: ["top", "bottom"] },
    { layers: ["top", "inner1"] },
    { layers: ["inner1", "inner2"] },
    { layers: ["bottom", "inner4"] },
    { from_layer: "inner2", to_layer: "inner1" },
  ]) {
    test(`via drills remain pink for ${JSON.stringify(span)} (high detail: ${renderViasInHighDetail})`, () => {
      const elements = [
        {
          type: "pcb_board",
          pcb_board_id: "board",
          center: { x: 0, y: 0 },
          width: 10,
          height: 10,
          num_layers: 6,
        },
        {
          type: "pcb_via",
          pcb_via_id: "via",
          x: 0,
          y: 0,
          outer_diameter: 0.6,
          hole_diameter: 0.3,
          ...span,
        },
      ] as CircuitJson
      const scene = compileCircuitJson(elements, { renderViasInHighDetail })
      expect(scene.diagnostics).toEqual([])
      const drill = scene.layers.find(
        (l) => l.name === "drill" || l.name.startsWith("drill:"),
      )
      expect(drill).toBeDefined()
      expect(meshCovers({ mesh: drill!.paint, point: { x: 0, y: 0 } })).toBe(
        true,
      )
      expect([...drill!.paint.vertices.slice(2, 6)]).toEqual([
        1,
        expect.closeTo(38 / 255),
        expect.closeTo(226 / 255),
        1,
      ])
      const through =
        span.layers?.includes("top") && span.layers.includes("bottom")
      const board = scene.layers.find((l) => l.name === "board")!
      expect(meshCovers({ mesh: board.erase, point: { x: 0, y: 0 } })).toBe(
        !!through,
      )
      for (const layer of scene.layers.filter((l) =>
        /^(top|bottom|inner\d+)$/.test(l.name),
      )) {
        expect(meshCovers({ mesh: layer.erase, point: { x: 0, y: 0 } })).toBe(
          true,
        )
      }
    })
  }
}
