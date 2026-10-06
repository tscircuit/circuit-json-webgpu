import type { AnyCircuitElement } from "circuit-json"
import { createBoardOwnerMap } from "@tscircuit/circuit-json-util"
import { getViasFromTraces } from "../upstream/circuit-to-canvas/lib/drawer/elements/pcb-trace/get-vias-from-traces"

/** SVG 0.0.441 ignores route-via diameters and deduplicates by position alone.
 * Use the pinned Canvas reference's route-via expansion for the SVG input.
 * WebGPU still receives the original, unexpanded Circuit JSON, so a missing
 * route via in its compiler remains a parity failure.
 */
export function prepareSvgElements(elements: AnyCircuitElement[]) {
  const vias = getViasFromTraces(elements, {
    boardOwnerMap: createBoardOwnerMap(elements),
  } as Parameters<typeof getViasFromTraces>[1])
  return [...elements, ...vias]
}
