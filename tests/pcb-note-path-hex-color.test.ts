import { expect, test } from "bun:test"
import { pcb_note_line, pcb_note_path } from "circuit-json"
import { compileCircuitJson } from "../lib"
import { DEFAULT_LAYER_COLORS } from "../lib/colors"
import { fixtures } from "../site/fixtures"

test("repro: a red PCB note path renders blue while a red note line stays red", () => {
  const elements = fixtures["note-path-hex-color"].elements
  const path = pcb_note_path.parse(
    elements.find((e) => e.type === "pcb_note_path"),
  )
  const line = pcb_note_line.parse(
    elements.find((e) => e.type === "pcb_note_line"),
  )
  expect(path.color).toBe("#ff0000")
  expect(line.color).toBe(path.color)
  const pathScene = compileCircuitJson([path])
  const lineScene = compileCircuitJson([line])
  expect(pathScene.diagnostics).toEqual([])
  expect(lineScene.diagnostics).toEqual([])
  const pathMesh = pathScene.layers[0].paint
  expect(pathMesh.indices.length).toBeGreaterThan(0)
  expect(pathMesh.vertices.slice(2, 6)).toEqual(
    new Float32Array(DEFAULT_LAYER_COLORS.top_notes),
  )
  expect(lineScene.layers[0].paint.vertices.slice(2, 6)).toEqual(
    new Float32Array([1, 0, 0, 1]),
  )
})
