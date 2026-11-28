import { expect, test } from "bun:test"
import { pcb_note_line, pcb_note_path } from "circuit-json"
import { compileCircuitJson, DEFAULT_LAYER_COLORS } from "../lib"

test("pcb_note_path honors explicit hex and rgba colors like pcb_note_line", () => {
  const path = pcb_note_path.parse({
    type: "pcb_note_path",
    pcb_note_path_id: "red-path",
    layer: "top",
    route: [
      { x: -8, y: -4 },
      { x: 0, y: -8 },
      { x: 8, y: -4 },
    ],
    stroke_width: 0.4,
    color: "#ff0000",
  })
  const line = pcb_note_line.parse({
    type: "pcb_note_line",
    pcb_note_line_id: "red-line",
    layer: "top",
    x1: -8,
    y1: 5,
    x2: 8,
    y2: 5,
    stroke_width: 0.4,
    color: "#ff0000",
  })

  const pathScene = compileCircuitJson([path])
  const lineScene = compileCircuitJson([line])
  expect(pathScene.diagnostics).toEqual([])
  expect(lineScene.diagnostics).toEqual([])

  const pathMesh = pathScene.layers[0].paint
  const lineMesh = lineScene.layers[0].paint
  expect(pathMesh.indices.length).toBeGreaterThan(0)
  expect(lineMesh.indices.length).toBeGreaterThan(0)

  const expectedRed = [...new Float32Array([1, 0, 0, 1])]
  for (let i = 0; i < pathMesh.vertices.length; i += 8) {
    expect([...pathMesh.vertices.slice(i + 2, i + 6)]).toEqual(expectedRed)
  }
  expect(pathMesh.vertices.slice(2, 6)).toEqual(lineMesh.vertices.slice(2, 6))
})

test("pcb_note_path falls back to DEFAULT_LAYER_COLORS when color is omitted", () => {
  const defaultPath = pcb_note_path.parse({
    type: "pcb_note_path",
    pcb_note_path_id: "default-bottom-path",
    layer: "bottom",
    route: [
      { x: -2, y: 0 },
      { x: 2, y: 0 },
    ],
    stroke_width: 0.2,
  })
  const rgbaPath = pcb_note_path.parse({
    type: "pcb_note_path",
    pcb_note_path_id: "rgba-bottom-path",
    layer: "bottom",
    route: [
      { x: -2, y: 1 },
      { x: 2, y: 1 },
    ],
    stroke_width: 0.2,
    color: "rgba(34, 204, 136, 0.5)",
  })

  const defaultScene = compileCircuitJson([defaultPath])
  expect(defaultScene.diagnostics).toEqual([])
  expect(defaultScene.layers[0].name).toBe("bottom_notes")
  expect(defaultScene.layers[0].paint.vertices.slice(2, 6)).toEqual(
    new Float32Array(DEFAULT_LAYER_COLORS.bottom_notes),
  )

  const rgbaScene = compileCircuitJson([rgbaPath])
  expect(rgbaScene.diagnostics).toEqual([])
  expect(rgbaScene.layers[0].paint.vertices.slice(2, 6)).toEqual(
    new Float32Array([34 / 255, 204 / 255, 136 / 255, 0.5]),
  )
})
