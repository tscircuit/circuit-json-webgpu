import { expect, test } from "bun:test"
import { compileCircuitJson, type CircuitJson } from "../lib"
import boardViaTenting from "./fixtures/board-via-tenting.circuit.json"

type CircuitElementIndex = number

test("the via-tenting board compiles its white annotation legends", () => {
  const circuitJson = boardViaTenting as CircuitJson
  const scene = compileCircuitJson(circuitJson)
  expect(scene.diagnostics).toEqual([])
  const notes = scene.layers.find((layer) => layer.name === "top_notes")!
  expect(notes.paint.indices.length).toBeGreaterThan(0)
  const whiteNoteIndices = new Set<CircuitElementIndex>(
    circuitJson.flatMap((element, index) =>
      element.type === "pcb_note_text" && element.color === "white" ? [index] : [],
    ),
  )
  let whiteVertices = 0
  for (let offset = 0; offset < notes.paint.vertices.length; offset += 8) {
    if (!whiteNoteIndices.has(notes.paint.vertices[offset + 6])) continue
    whiteVertices++
    expect([...notes.paint.vertices.slice(offset + 2, offset + 6)]).toEqual([
      1, 1, 1, 1,
    ])
  }
  expect(whiteVertices).toBeGreaterThan(0)
})
