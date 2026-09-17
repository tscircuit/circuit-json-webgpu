import { CircuitToWebGpuDrawer } from "../../lib"
import { parseColor } from "../../lib/colors"
import { compose } from "transformation-matrix"
const drawers = new Map<
  string,
  { canvas: HTMLCanvasElement; drawer: CircuitToWebGpuDrawer }
>()
async function render(c: any) {
  const axis = c.matrix.d < 0 ? "up" : "down"
  if (c.primitive) {
    const p = c.primitive
    c.elements = [
      {
        type: p.shape === "dimension" ? "pcb_note_dimension" : "pcb_smtpad",
        pcb_smtpad_id: "shape",
        layer: "top",
        shape: p.shape,
        center: p.center,
        x: p.center?.x,
        y: p.center?.y,
        radius: p.radius,
        width: p.width ?? p.radius_x * 2,
        height: p.height ?? p.radius_y * 2,
        corner_radius: p.borderRadius,
        ccw_rotation:
          (axis === "down" ? -1 : 1) *
          (p.rotation ?? p.ccwRotationDegrees ?? 0),
      },
    ]
  }
  const key = axis + (c.primitive?.fill ?? "")
  let target = drawers.get(key)
  if (!target) {
    const canvas = document.createElement("canvas")
    document.body.append(canvas)
    target = {
      canvas,
      drawer: await CircuitToWebGpuDrawer.create(canvas, {
        textYAxis: axis,
        layerColors: c.primitive?.fill
          ? { top: parseColor(c.primitive.fill) }
          : undefined,
      }),
    }
    drawers.set(key, target)
  }
  const { canvas, drawer } = target
  const before = new Image()
  before.src = `/tests/actual/parity/${c.id}.before.png`
  await before.decode()
  canvas.width = c.width
  canvas.height = c.height
  drawer.setCircuitJson(c.elements)
  let layers = c.options.layers?.map((l: string) => l.replace(/_copper$/, ""))
  // The viewer and reference drawer have different visibility defaults. Make
  // those options explicit rather than changing fixtures or approving new goldens.
  layers = layers?.map((l: string) =>
    l
      .replace(/^(top|bottom)_soldermask$/, "soldermask_$1")
      .replace("_fabrication_note", "_fabrication")
      .replace("_note", "_notes"),
  )
  drawer.render({
    transform: compose(c.contextTransform, c.matrix),
    layers,
    hiddenLayerOpacity: 1,
    selectedLayer:
      c.options.layers
        ?.find((l: string) => l.endsWith("_copper"))
        ?.split("_")[0] ?? "top",
    showCopperPours: true,
    showSilkscreen: true,
    showCourtyards: true,
    showFabricationNotes: true,
    showPcbNotes: c.options.showPcbNotes ?? true,
    showSolderMask: c.options.drawSoldermask ?? false,
    background: [0, 0, 0, 0],
  })

  const output = document.createElement("canvas")
  output.width = c.width
  output.height = c.height
  const ctx = output.getContext("2d")!

  ctx.drawImage(before, 0, 0)
  ctx.globalAlpha = c.globalAlpha
  ctx.drawImage(canvas, 0, 0)
  return {
    png: output.toDataURL("image/png").split(",")[1],
    diagnostics: drawer.diagnostics,
  }
}
Object.assign(window, {
  parity: {
    render,
    dispose() {
      for (const { drawer } of drawers.values()) drawer.dispose()
    },
  },
})
