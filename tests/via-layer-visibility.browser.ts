import { CircuitToWebGpuDrawer } from "../lib"
import { circuit, vias } from "./fixtures/via-layer-visibility"

export async function renderViaLayerStack() {
  const canvas = document.createElement("canvas")
  canvas.width = 800
  canvas.height = 300
  document.body.append(canvas)
  const drawer = await CircuitToWebGpuDrawer.create(canvas)
  const stack = document.createElement("canvas")
  stack.width = 800
  stack.height = 1664
  const ctx = stack.getContext("2d")!
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, stack.width, stack.height)
  const layers = ["top", "inner1", "inner2", "bottom", undefined] as const
  const observations: {
    layer: string
    id: string
    visible: boolean
    expected: boolean
    hole: boolean
  }[] = []
  try {
    for (const [index, layer] of layers.entries()) {
      drawer.drawElements(
        [
          ...circuit,
          {
            type: "pcb_note_text",
            pcb_note_text_id: "view_label",
            font: "tscircuit2024",
            layer: "top",
            anchor_position: { x: 0, y: 2.5 },
            anchor_alignment: "center",
            font_size: 0.45,
            text: `Copper view: ${layer ?? "all layers"}`,
          },
        ],
        {
          transform: { a: 50, b: 0, c: 0, d: -50, e: 400, f: 150 },
          // Explicit copper views isolate physical layers; the overview shows all
          // retained copper at full opacity, using WebGPU's native layer colors.
          layers: layer
            ? [layer, "edge_cuts", "drill", "top_notes"]
            : undefined,
          selectedLayer: layer ?? "top",
          hiddenLayerOpacity: 1,
          showPcbNotes: true,
          background: [0, 0, 0, 1],
        },
      )
      const view = document.createElement("canvas")
      view.width = 800
      view.height = 300
      const viewCtx = view.getContext("2d")!
      // Copy the submitted frame before WebGPU's presentation buffer clears.
      viewCtx.drawImage(canvas, 0, 0)
      for (const via of vias) {
        const x = 400 + via.x * 50
        const pixel = [...viewCtx.getImageData(x + 19, 150, 1, 1).data]
        const center = [...viewCtx.getImageData(x, 150, 1, 1).data]
        const visible = pixel.slice(0, 3).some((channel) => channel !== 0)
        const expected = !layer || via.layers.includes(layer)
        // Blind/buried drills erase their physical copper; through drills have
        // the renderer's drill color. Neither may leave copper in the center.
        const hole =
          (center[0] === 0 && center[1] === 0 && center[2] === 0) ||
          (center[0] > 240 && center[1] < 50 && center[2] > 200)
        observations.push({
          layer: layer ?? "all layers",
          id: via.pcb_via_id,
          visible,
          expected,
          hole,
        })
      }
      ctx.drawImage(view, 0, 100 + index * 316)
    }
    const passing = observations.every(
      (o) => o.visible === o.expected && o.hole,
    )
    ctx.fillStyle = "#141414"
    ctx.fillRect(0, 0, 800, 100)
    ctx.textAlign = "center"
    ctx.fillStyle = passing ? "#4ade80" : "#fb7185"
    ctx.font = "bold 26px sans-serif"
    ctx.fillText(`Repro: ${passing ? "PASSING" : "FAILING"}`, 400, 35)
    ctx.fillStyle = "#f4f4f4"
    ctx.font = "18px sans-serif"
    ctx.fillText(
      "PCB views must show vias only on their physical copper layers.",
      400,
      64,
    )
    ctx.fillStyle = "#a3a3a3"
    ctx.font = "14px sans-serif"
    ctx.fillText(
      "Compare the rendered vias with their listed layers in each view below.",
      400,
      86,
    )
    return {
      png: stack.toDataURL("image/png").split(",")[1],
      observations,
      diagnostics: drawer.diagnostics,
    }
  } finally {
    drawer.dispose()
    canvas.remove()
  }
}
Object.assign(window, { renderViaLayerStack })
declare global {
  interface Window {
    renderViaLayerStack: typeof renderViaLayerStack
  }
}
