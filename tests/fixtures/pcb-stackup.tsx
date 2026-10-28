import { Circuit } from "@tscircuit/core"

export async function createStackupCircuit() {
  const circuit = new Circuit()
  circuit.add(
    <board
      width="16mm"
      height="10mm"
      layers={8}
      fabricatorPreset="jlcpcb_standard"
    >
      <resistor name="R1" resistance="1k" footprint="0402" pcbX={-4} />
      <resistor name="R2" resistance="2k" footprint="0402" pcbX={4} />
      <trace from=".R1 > .pin2" to=".R2 > .pin1" thickness="0.3mm" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}

if (import.meta.main) {
  console.log(JSON.stringify(await createStackupCircuit(), null, 2))
}
