export const TARGET_CIRCLE_CHORD_ERROR_MM = 0.0025

const MIN_CIRCLE_SEGMENTS = 12
const MAX_CIRCLE_SEGMENTS = 96

export function getCircleSegmentCount(radiusMm: number): number {
  if (!(radiusMm > 0)) return MIN_CIRCLE_SEGMENTS

  const chordHalfAngleRadians = Math.acos(
    Math.max(-1, 1 - TARGET_CIRCLE_CHORD_ERROR_MM / radiusMm),
  )
  const segmentCount = Math.ceil(Math.PI / chordHalfAngleRadians)

  // Never generate more geometry than the renderer's legacy 96-segment circle.
  // Large radii can therefore exceed the target chord error without regressing
  // from the previous renderer geometry.
  return Math.max(
    MIN_CIRCLE_SEGMENTS,
    Math.min(MAX_CIRCLE_SEGMENTS, segmentCount),
  )
}
