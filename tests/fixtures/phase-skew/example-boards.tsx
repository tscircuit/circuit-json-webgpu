import { Circuit } from "@tscircuit/core"
import type { PcbPath } from "@tscircuit/props"
import { Fragment, type ReactElement } from "react"
import type { CircuitJson } from "../../../lib"

const BOARD_WIDTH_MM = 28
const BOARD_HEIGHT_MM = 9
const TERMINATION_X_MM = 12
const PAIR_HALF_SPACING_MM = 0.6
const TRACE_WIDTH_MM = 0.24
const PAD_DIAMETER_MM = 0.65
const DETOUR_TOP_LENGTH_MM = 0.8

/** Two explicitly routed traces declared as a differential pair. */
function Pair({
  positivePath = [],
  negativePath = [],
  loadLayer = "top",
}: {
  positivePath?: PcbPath
  negativePath?: PcbPath
  loadLayer?: "top" | "bottom"
}): ReactElement {
  const legs = [
    { name: "PAIR_P", y: PAIR_HALF_SPACING_MM, path: positivePath },
    { name: "PAIR_N", y: -PAIR_HALF_SPACING_MM, path: negativePath },
  ]
  return (
    <>
      {legs.map(({ name, y, path }) => (
        <Fragment key={name}>
          <testpoint
            name={`${name}_SRC`}
            footprintVariant="pad"
            padDiameter={PAD_DIAMETER_MM}
            doNotPlace
            pcbX={-TERMINATION_X_MM}
            pcbY={y}
          />
          <testpoint
            name={`${name}_LOAD`}
            footprintVariant="pad"
            padDiameter={PAD_DIAMETER_MM}
            doNotPlace
            pcbX={TERMINATION_X_MM}
            pcbY={y}
            layer={loadLayer}
          />
          <trace
            name={name}
            from={`.${name}_SRC > .pin1`}
            to={`.${name}_LOAD > .pin1`}
            thickness={TRACE_WIDTH_MM}
            pcbPath={path}
          />
        </Fragment>
      ))}
      <differentialpair
        name="PAIR"
        positiveConnection="PAIR_P"
        negativeConnection="PAIR_N"
        pcbTraceGap={2 * PAIR_HALF_SPACING_MM - TRACE_WIDTH_MM}
      />
    </>
  )
}

/** A 45-degree detour in coordinates relative to the source pad. */
function detour({ x, height }: { x: number; height: number }): PcbPath {
  const run = Math.abs(height)
  return [
    { x, y: 0 },
    { x: x + run, y: height },
    { x: x + run + DETOUR_TOP_LENGTH_MM, y: height },
    { x: x + 2 * run + DETOUR_TOP_LENGTH_MM, y: 0 },
  ]
}

/** A straight pair with identical lengths. */
export function MatchedPairBoard(): ReactElement {
  return (
    <board
      width={BOARD_WIDTH_MM}
      height={BOARD_HEIGHT_MM}
      routeRemaining={false}
    >
      <Pair />
    </board>
  )
}

/** A pair whose positive trace takes a longer path near its source. */
export function TuningBumpBoard(): ReactElement {
  return (
    <board
      width={BOARD_WIDTH_MM}
      height={BOARD_HEIGHT_MM}
      routeRemaining={false}
    >
      <Pair positivePath={detour({ x: 2, height: 2.2 })} />
    </board>
  )
}

/** A tuned pair that crosses to the bottom layer through matching vias. */
export function LayerChangeBoard(): ReactElement {
  const via: PcbPath = [
    { x: TERMINATION_X_MM, y: 0, via: true, toLayer: "bottom" },
  ]
  return (
    <board
      width={BOARD_WIDTH_MM}
      height={BOARD_HEIGHT_MM}
      layers={2}
      fabricatorPreset="jlcpcb_standard"
      routeRemaining={false}
    >
      <Pair
        loadLayer="bottom"
        positivePath={[...detour({ x: 3, height: 1.1 }), ...via]}
        negativePath={[...via, ...detour({ x: 17, height: -1.1 })]}
      />
    </board>
  )
}

/** Render the fixture through core and omit the generated pad labels. */
export async function renderBoard({
  board,
}: { board: ReactElement }): Promise<CircuitJson> {
  const circuit = new Circuit({ platform: { drcChecksDisabled: true } })
  circuit.add(board)
  await circuit.renderUntilSettled()
  return circuit
    .getCircuitJson()
    .filter((element) => element.type !== "pcb_silkscreen_text")
}
