import { expect, test } from "bun:test"
import { compileCircuitJson } from "../lib"
import { createCoverlayCircuit } from "./fixtures/coverlay-circuit"

test("yellow flex coverlay reaches compiled mask vertices", () => {
  const scene = compileCircuitJson(createCoverlayCircuit("yellow"))
  const mask = scene.layers.find((layer) => layer.name === "soldermask_top")!
  expect([...mask.paint.vertices.slice(2, 6)]).toEqual([
    ...new Float32Array([204 / 255, 156 / 255, 51 / 255, 1]),
  ])
})

test("black flex coverlay reaches both mask faces", () => {
  const scene = compileCircuitJson(createCoverlayCircuit("black"))
  expect([
    ...scene.layers
      .find((layer) => layer.name === "soldermask_top")!
      .paint.vertices.slice(2, 6),
  ]).toEqual([...new Float32Array([17 / 255, 17 / 255, 17 / 255, 1])])
  expect([
    ...scene.layers
      .find((layer) => layer.name === "soldermask_bottom")!
      .paint.vertices.slice(2, 6),
  ]).toEqual([...new Float32Array([17 / 255, 17 / 255, 17 / 255, 1])])
})

test("white coverlay leaves the flex substrate amber", () => {
  const scene = compileCircuitJson(createCoverlayCircuit("white"))
  expect([
    ...scene.layers
      .find((layer) => layer.name === "soldermask_top")!
      .paint.vertices.slice(2, 6),
  ]).toEqual([1, 1, 1, 1])
  expect([
    ...scene.layers
      .find((layer) => layer.name === "board")!
      .paint.vertices.slice(2, 6),
  ]).toEqual([...new Float32Array([204 / 255, 156 / 255, 51 / 255, 1])])
})

test("rigid boards ignore coverlay color", () => {
  const circuit = createCoverlayCircuit("black")
  const board = circuit.find((e) => e.type === "pcb_board")!
  board.material = "fr4"
  const black = compileCircuitJson(circuit)
  board.coverlay_color = "white"
  expect(compileCircuitJson(circuit)).toEqual(black)
})

test("explicit layer colors override coverlay metadata", () => {
  const scene = compileCircuitJson(createCoverlayCircuit("black"), {
    layerColors: { soldermask_top: [1, 0, 1, 1] },
  })
  expect([
    ...scene.layers
      .find((layer) => layer.name === "soldermask_top")!
      .paint.vertices.slice(2, 6),
  ]).toEqual([1, 0, 1, 1])
})

test("omitted coverlay color preserves existing mask colors", () => {
  const scene = compileCircuitJson(createCoverlayCircuit(undefined))
  expect([
    ...scene.layers
      .find((layer) => layer.name === "soldermask_top")!
      .paint.vertices.slice(2, 6),
  ]).toEqual([...new Float32Array([12 / 255, 55 / 255, 33 / 255, 1])])
})
