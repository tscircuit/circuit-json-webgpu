import { expect, test } from "bun:test"
import { compileCircuitJson } from "../lib"
import { createAm3352DdrOdtCircuit } from "./fixtures/am3352-ddr-odt"

test("AM3352 DDR_ODT trace remains visible beneath the WebGPU solder mask", async () => {
  const elements = await createAm3352DdrOdtCircuit()
  const traceIndex = elements.findIndex(
    (element) => element.type === "pcb_trace",
  )
  const trace = elements[traceIndex]
  expect(trace?.type).toBe("pcb_trace")
  if (trace?.type !== "pcb_trace") throw new Error("Missing DDR_ODT trace")
  expect(
    elements.find((element) => element.type === "pcb_board")?.num_layers,
  ).toBe(8)
  const wires = trace.route.filter((point) => point.route_type === "wire")
  expect(
    wires.every((wire) => wire.layer === "top" && wire.width === 0.1),
  ).toBe(true)
  expect(wires[0]).toMatchObject({ x: -2, y: -6.8 })
  expect(wires.at(-1)).toMatchObject({ x: -3.199892, y: -28.200023 })

  const scene = compileCircuitJson(elements)
  expect(scene.diagnostics).toEqual([])
  const copper = scene.layers.find((layer) => layer.name === "top")!
  const mask = scene.layers.find((layer) => layer.name === "soldermask_top")!
  const elementIndices = (vertices: Float32Array) =>
    Array.from(
      { length: vertices.length / 8 },
      (_, index) => vertices[index * 8 + 6],
    )
  expect(elementIndices(copper.paint.vertices)).toContain(traceIndex)
  expect(elementIndices(mask.paint.vertices)).toContain(traceIndex)
  for (const [index, element] of elements.entries()) {
    if (element.type === "pcb_smtpad" || element.type === "pcb_via")
      expect(elementIndices(mask.erase.vertices)).toContain(index)
  }
})
