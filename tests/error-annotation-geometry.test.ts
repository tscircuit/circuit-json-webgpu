import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { compileCircuitJson } from "../lib"

const courtyard = {
  type: "pcb_courtyard_rect",
  pcb_courtyard_rect_id: "courtyard",
  pcb_component_id: "component-1",
  center: { x: 0, y: 0 },
  width: 2,
  height: 2,
  layer: "top",
} satisfies CircuitJson[number]

test("courtyard overlap errors leave drawable geometry unchanged", () => {
  const overlap = {
    type: "pcb_courtyard_overlap_error",
    pcb_error_id: "overlap",
    error_type: "pcb_courtyard_overlap_error",
    pcb_component_ids: ["component-1", "component-2"],
    message: "Component courtyards overlap",
  } satisfies CircuitJson[number]
  const elements = [courtyard, overlap]
  const original = structuredClone(elements)
  const scene = compileCircuitJson(elements)
  const withoutError = compileCircuitJson([courtyard])

  expect(scene.diagnostics).toEqual([])
  expect(scene.triangleCount).toBeGreaterThan(0)
  expect(scene.layers).toEqual(withoutError.layers)
  expect(scene.triangleCount).toBe(withoutError.triangleCount)
  expect(elements).toEqual(original)
})

test("annotation-prefixed errors and warnings are metadata, not geometry", () => {
  for (const prefix of [
    "courtyard",
    "silkscreen",
    "fabrication_note",
    "note",
    "user_note",
  ]) {
    for (const suffix of ["error", "warning"]) {
      // Include future record types that share the annotation prefixes.
      const elements = [
        { type: `pcb_${prefix}_overlap_${suffix}` },
      ] as CircuitJson
      const scene = compileCircuitJson(elements)
      expect(scene.diagnostics).toEqual([])
      expect(scene.layers).toEqual([])
      expect(scene.triangleCount).toBe(0)
    }
  }
})

test("unsupported annotation geometry still produces a diagnostic", () => {
  const scene = compileCircuitJson([
    { type: "pcb_courtyard_unknown_shape" },
  ] as unknown as CircuitJson)
  expect(scene.diagnostics).toEqual([
    {
      elementId: "pcb_courtyard_unknown_shape:0",
      type: "pcb_courtyard_unknown_shape",
      message: "Error: Unsupported annotation geometry",
    },
  ])
})
