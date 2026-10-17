export const MAX_ARC_CHORD_ERROR_MM = 0.0025

const MIN_FULL_CIRCLE_SEGMENTS = 12
const MAX_FULL_CIRCLE_SEGMENTS = 96
const FULL_CIRCLE_RADIANS = Math.PI * 2

export function getArcSegmentCount({
  radiusMm,
  sweepRadians,
}: {
  radiusMm: number
  sweepRadians: number
}): number {
  const sweepFraction = Math.abs(sweepRadians) / FULL_CIRCLE_RADIANS
  const minimumSegmentCount = Math.ceil(
    MIN_FULL_CIRCLE_SEGMENTS * sweepFraction,
  )
  const maximumSegmentCount = Math.ceil(
    MAX_FULL_CIRCLE_SEGMENTS * sweepFraction,
  )

  if (!(radiusMm > 0)) return minimumSegmentCount

  const chordHalfAngleRadians = Math.acos(
    Math.max(-1, 1 - MAX_ARC_CHORD_ERROR_MM / radiusMm),
  )
  const segmentCount = Math.ceil(
    Math.abs(sweepRadians) / (chordHalfAngleRadians * 2),
  )

  return Math.max(
    minimumSegmentCount,
    Math.min(maximumSegmentCount, segmentCount),
  )
}
