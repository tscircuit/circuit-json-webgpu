import type { CircuitJson, CircuitToWebGpuDrawer } from "../lib"

export async function checkAm3352Soldermask({
  drawer,
  canvas,
  elements,
}: {
  drawer: CircuitToWebGpuDrawer
  canvas: HTMLCanvasElement
  elements: CircuitJson
}) {
  const frames: Record<string, string> = {}
  for (const showSolderMask of [true, false]) {
    drawer.drawElements(elements, {
      transform: { a: 20, b: 0, c: 0, d: -20, e: 454.50124, f: 60 },
      selectedLayer: "top",
      hiddenLayerOpacity: 0,
      showSolderMask,
      background: [0, 0, 0, 1],
    })
    await drawer.flush()
    frames[showSolderMask ? "maskOn" : "maskOff"] = canvas
      .toDataURL("image/png")
      .split(",")[1]
  }
  return { frames, diagnostics: drawer.diagnostics }
}
