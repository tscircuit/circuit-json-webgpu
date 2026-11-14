import { expect, test } from "bun:test"
import { compileCircuitJson } from "../lib"
import { mirroredSilkscreenText } from "./fixtures/silkscreen-mirroring"

test("top silkscreen honors explicit mirroring", () => {
  const normal = compileCircuitJson([
    { ...mirroredSilkscreenText, is_mirrored: false },
  ])
  const mirrored = compileCircuitJson([mirroredSilkscreenText])
  expect(normal.diagnostics).toEqual([])
  expect(mirrored.diagnostics).toEqual([])
  const normalMesh = normal.layers.find((layer) =>
    layer.name.endsWith("_silkscreen_text"),
  )!.paint
  const mirroredMesh = mirrored.layers.find((layer) =>
    layer.name.endsWith("_silkscreen_text"),
  )!.paint
  expect(mirroredMesh.indices.length).toBeGreaterThan(0)
  expect(mirroredMesh.vertices.length).toBe(normalMesh.vertices.length)
  for (let i = 0; i < normalMesh.vertices.length; i += 8) {
    expect(mirroredMesh.vertices[i]).toBeCloseTo(-normalMesh.vertices[i], 4)
    expect(mirroredMesh.vertices[i + 1]).toBeCloseTo(
      normalMesh.vertices[i + 1],
      4,
    )
  }
})
