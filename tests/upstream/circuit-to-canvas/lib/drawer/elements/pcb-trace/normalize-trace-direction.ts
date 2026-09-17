// Returns a unit-length trace direction; used to keep offsets/join math consistent.
export function normalizeTraceDirection(
  x: number,
  y: number,
): { x: number; y: number } {
  const length = Math.hypot(x, y)
  if (length <= Number.EPSILON) return { x: 0, y: 0 }
  return { x: x / length, y: y / length }
}
