import { adaptiveCircle } from "./geometry"
import type { Point } from "./types"

export function getAdaptiveViaShape(
  center: Point,
  diameterMm: number,
): Point[][] {
  return [adaptiveCircle({ center, diameterMm })]
}
