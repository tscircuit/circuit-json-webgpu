import { expect, test } from "bun:test"
import { getResolvedColorElementIds } from "./parity/resolved-color-elements"

test("only resolved unsupported-color elements are excluded from the extra comparison", () => {
  const white = {
    elementId: "white-note",
    type: "pcb_note_text",
    message: "Error: Unsupported color: white",
  }
  const red = {
    ...white,
    elementId: "red-note",
    message: "Error: Unsupported color: red",
  }
  const shape = {
    elementId: "pad",
    type: "pcb_smtpad",
    message: "Unsupported shape",
  }
  expect(getResolvedColorElementIds()).toEqual([])
  expect(getResolvedColorElementIds([white, red, white, shape], [])).toEqual([
    "red-note",
    "white-note",
  ])
  expect(getResolvedColorElementIds([white, red, shape], [red, shape])).toEqual(
    ["white-note"],
  )
  expect(
    getResolvedColorElementIds(
      [white],
      [{ ...white, message: "Unsupported font" }],
    ),
  ).toEqual([])
})
