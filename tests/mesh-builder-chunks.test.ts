import { expect, test } from "bun:test"
import { MeshBuilder } from "../lib/geometry"

test("mesh vertices and indices retain their order across storage chunks", () => {
  const mesh = new MeshBuilder()
  const polygonCount = 6_000
  mesh.color = [0.25, 0.5, 0.75, 1]
  mesh.element = 7
  mesh.category = 2
  for (let x = 0; x < polygonCount; x++) {
    mesh.polygon([
      [
        { x, y: 0 },
        { x: x + 1, y: 0 },
        { x, y: 1 },
      ],
    ])
  }

  const { vertices, indices } = mesh.build()
  expect(vertices.length).toBe(polygonCount * 3 * 8)
  expect(indices.length).toBe(polygonCount * 3)
  for (let x = 0; x < polygonCount; x++) {
    const base = x * 3
    expect(vertices.subarray(base * 8, (base + 1) * 8)).toEqual(
      new Float32Array([x, 0, 0.25, 0.5, 0.75, 1, 7, 2]),
    )
    expect(indices.subarray(base, base + 3)).toEqual(
      new Uint32Array([base + 1, base + 2, base]),
    )
  }
})
