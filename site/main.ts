import {
  CircuitToWebGpuDrawer,
  type CircuitJson,
  type RenderOptions,
} from "../lib"
import { fixtures } from "./fixtures"
const canvas = document.querySelector("canvas")!,
  status = document.querySelector("#status")!
const drawer = await CircuitToWebGpuDrawer.create(canvas, {
  onDeviceLost: (message) => {
    status.textContent = message
    throw new Error(message)
  },
})
const defaultOptions: RenderOptions = {
  transform: { a: 14, b: 0, c: 0, d: -14, e: 400, f: 300 },
  selectedLayer: "top",
  hiddenLayerOpacity: 0.4,
  showCopperPours: true,
  showSolderMask: false,
  showSilkscreen: true,
  showFabricationNotes: false,
  showPcbNotes: true,
  showCourtyards: false,
  highlightedElementIds: [],
  background: [0, 0, 0, 1],
}
async function renderFixture(name: string) {
  const fixture = fixtures[name]
  if (!fixture) throw new Error(`Unknown fixture ${name}`)
  drawer.drawElements(fixture.elements, {
    ...defaultOptions,
    ...fixture.options,
  })
  await drawer.flush()
  status.textContent = JSON.stringify(
    { ...drawer.stats, diagnostics: drawer.diagnostics },
    null,
    2,
  )
  return { ...drawer.stats, diagnostics: drawer.diagnostics }
}
async function renderLarge() {
  const elements = (await (
    await fetch("/tests/fixtures/am3352-dev-board.circuit.json")
  ).json()) as CircuitJson
  drawer.drawElements(elements, {
    ...defaultOptions,
    transform: { a: 9, b: 0, c: 0, d: -9, e: 400, f: 300 },
  })
  await drawer.flush()
  return { ...drawer.stats, diagnostics: drawer.diagnostics }
}
const select = document.querySelector("select")!
for (const name of Object.keys(fixtures)) select.add(new Option(name, name))
select.onchange = () => {
  void renderFixture(select.value)
}
Object.assign(window, {
  gpuTest: {
    renderFixture,
    renderLarge,
    drawer,
    names: Object.keys(fixtures),
    adapterInfo: drawer.adapterInfo,
  },
})
await renderFixture(Object.keys(fixtures)[0])

declare global {
  interface Window {
    gpuTest: {
      renderFixture: typeof renderFixture
      renderLarge: typeof renderLarge
      drawer: CircuitToWebGpuDrawer
      names: string[]
      adapterInfo: GPUAdapterInfo | undefined
    }
  }
}
