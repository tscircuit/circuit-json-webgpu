import { expect, test } from "bun:test"
import { compileCircuitJson } from "../lib"
import { createStackupCircuit } from "./fixtures/pcb-stackup"

test("native TSX stackup metadata leaves rendered PCB geometry unchanged", async () => {
  const elements = await createStackupCircuit()
  const stackup = elements.find((element) => element.type === "pcb_stackup")!
  expect(stackup).toBeDefined()
  expect(
    elements.find((element) => element.type === "pcb_board")?.num_layers,
  ).toBe(8)
  expect(
    elements.filter((element) => element.type === "pcb_smtpad"),
  ).toHaveLength(4)
  expect(elements.some((element) => element.type === "pcb_trace")).toBe(true)

  const scene = compileCircuitJson(elements)
  expect(scene.diagnostics).toEqual([])
  expect(scene.triangleCount).toBeGreaterThan(0)
  const geometry = elements.filter((element) => element.type !== "pcb_stackup")
  const withoutStackup = compileCircuitJson(geometry)
  expect(scene.triangleCount).toBe(withoutStackup.triangleCount)
  // Vertex buffers include input element indices; keep those stable for equality.
  expect(compileCircuitJson([...geometry, stackup]).layers).toEqual(
    withoutStackup.layers,
  )
})
