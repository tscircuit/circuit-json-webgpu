import { Circuit } from "@tscircuit/core"

// DDR_ODT coordinates, width and endpoints from the AM3352 board's TSX route.
export async function createAm3352DdrOdtCircuit() {
  const circuit = new Circuit()
  circuit.add(
    <board width={20} height={64} layers={8} routingDisabled>
      <chip
        name="U1"
        pcbX={0}
        pcbY={0}
        footprint={
          <footprint>
            <smtpad
              portHints={["pin1", "G1"]}
              shape="circle"
              radius={0.2}
              pcbX={-2}
              pcbY={-6.8}
            />
            <smtpad
              portHints={["pin2", "F5"]}
              shape="circle"
              radius={0.2}
              pcbX={-2.8}
              pcbY={-3.58}
            />
          </footprint>
        }
      />
      <chip
        name="U3"
        pcbX={0}
        pcbY={0}
        footprint={
          <footprint>
            <smtpad
              portHints={["pin1", "K1"]}
              shape="circle"
              radius={0.175006}
              pcbX={-3.199892}
              pcbY={-28.200023}
            />
          </footprint>
        }
      />
      <via
        name="DDR_POWER_F5"
        pcbX={-2.8}
        pcbY={-3.58}
        fromLayer="top"
        toLayer="inner2"
        holeDiameter={0.15}
        outerDiameter={0.3}
        connectsTo=".U1 > .F5"
      />
      <trace
        name="DDR_ODT"
        from=".U1 > .G1"
        to=".U3 > .K1"
        width={0.1}
        pcbPath={[
          ".U1 > .G1",
          { x: -2, y: -6.8 },
          { x: -2.725062, y: -7.525062 },
          { x: -2.725062, y: -27.725193 },
          { x: -3.199892, y: -28.200023 },
          ".U3 > .K1",
        ]}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
