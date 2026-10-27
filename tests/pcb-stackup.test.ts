import { expect, test } from "bun:test"
import { compileCircuitJson } from "../lib"
import { createStackupCircuit } from "./fixtures/pcb-stackup"

test("reproduces the stackup diagnostic that stops pcb-viewer's WebGPU worker", async () => {
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
  expect(scene.diagnostics).toEqual([
    {
      elementId: stackup.pcb_stackup_id,
      type: "pcb_stackup",
      message: "Error: Unsupported PCB element",
    },
  ])
  expect(scene.triangleCount).toBeGreaterThan(0)
  expect(
    compileCircuitJson(
      elements.filter((element) => element.type !== "pcb_stackup"),
    ).diagnostics,
  ).toEqual([])
})
