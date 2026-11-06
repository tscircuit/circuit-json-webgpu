import { expect, test } from "bun:test"
import { getPcbDimensionGeometry } from "../lib/pcb-dimension/get-pcb-dimension-geometry"

test("getPcbDimensionGeometry places explicit 0 and 180 degree text rotation at the same offset as omitted text_ccw_rotation", () => {
  const baseDimension = {
    type: "pcb_note_dimension" as const,
    pcb_note_dimension_id: "dim_1",
    from: { x: 0, y: 0 },
    to: { x: 10, y: 0 },
    text: "10.00 mm",
    font: "tscircuit2024" as const,
    font_size: 1.5,
    arrow_size: 1,
    layer: "top" as const,
    offset_distance: 2,
    offset_direction: { x: 0, y: 1 },
  }

  const omitted = getPcbDimensionGeometry({ pcbDimension: baseDimension })
  const zeroRotation = getPcbDimensionGeometry({
    pcbDimension: { ...baseDimension, text_ccw_rotation: 0 },
  })
  const halfTurnRotation = getPcbDimensionGeometry({
    pcbDimension: { ...baseDimension, text_ccw_rotation: 180 },
  })
  const angledRotation = getPcbDimensionGeometry({
    pcbDimension: { ...baseDimension, text_ccw_rotation: 45 },
  })

  expect(zeroRotation.label?.anchorPosition).toEqual(
    omitted.label?.anchorPosition,
  )
  expect(halfTurnRotation.label?.anchorPosition).toEqual(
    omitted.label?.anchorPosition,
  )
  expect(angledRotation.label?.anchorPosition.y).toBeGreaterThan(
    omitted.label!.anchorPosition.y,
  )
})
