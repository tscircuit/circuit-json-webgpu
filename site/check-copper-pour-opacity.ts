import { CircuitToWebGpuDrawer, type CircuitJson } from "../lib"
import { classicF1J6Ground } from "../tests/fixtures/classic-f1-j6-ground"

export async function checkCopperPourOpacity() {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 200
  const drawer = await CircuitToWebGpuDrawer.create(canvas)
  const coveredWire = {
    route_type: "wire",
    layer: "top",
    y: 1,
    width: 0.5,
    is_inside_copper_pour: true,
    copper_pour_id: "pour_top",
  }
  const elements = [
    ...["top", "bottom", "inner1"].map((layer, i) => ({
      type: "pcb_copper_pour",
      pcb_copper_pour_id: `pour_${layer}`,
      shape: "rect",
      layer,
      center: { x: -6 + i * 6, y: 0 },
      width: 4,
      height: 4,
    })),
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad",
      shape: "rect",
      layer: "top",
      x: -6,
      y: 0,
      width: 1,
      height: 1,
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace",
      route: [
        { route_type: "wire", layer: "top", x: -8, y: 5, width: 1 },
        { route_type: "wire", layer: "top", x: 8, y: 5, width: 1 },
      ],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "covered-trace",
      route: [
        { ...coveredWire, x: -7.5 },
        {
          ...coveredWire,
          x: -6,
          start_width: 0.5,
          end_width: 0.75,
          width_interpolation_mode: "linear",
        },
        { ...coveredWire, x: -4.5, width: 0.75 },
      ],
    },
  ] as CircuitJson
  const frames: Record<string, string> = {}
  const capture = (name: string) => {
    frames[name] = canvas.toDataURL("image/png").split(",")[1]
  }
  const checkClassicF1 = async () => {
    const { elements, traceId } = classicF1J6Ground
    drawer.drawElements(elements, {
      transform: { a: 20, b: 0, c: 0, d: -20, e: 489.5, f: -188 },
      selectedLayer: "top",
    })
    const frames: Record<string, string> = {}
    const capture = async (name: string) => {
      await drawer.flush()
      frames[name] = canvas.toDataURL("image/png").split(",")[1]
    }
    const initialUploads = drawer.stats.geometryUploads
    await capture("shown")
    drawer.render({ showCopperPours: false })
    await capture("hidden")
    drawer.render({ showCopperPours: true, copperPourOpacity: 0 })
    await capture("zero")
    drawer.render({ copperPourOpacity: 0.5, xRayElementIds: [traceId] })
    await capture("xray")
    drawer.render({ xRayElementIds: [] })
    await capture("restored")
    return {
      frames,
      diagnostics: drawer.diagnostics,
      visibilityUploads: drawer.stats.geometryUploads - initialUploads,
    }
  }
  try {
    drawer.drawElements(elements, {
      transform: { a: 10, b: 0, c: 0, d: -10, e: 100, f: 100 },
      hiddenLayerOpacity: 0.4,
    })
    capture("default")
    for (const background of ["black", "white"] as const) {
      const value = background === "black" ? 0 : 1
      drawer.render({
        hiddenLayerOpacity: 1,
        background: [value, value, value, 1],
      })
      capture(background)
    }
    drawer.render({ hiddenLayerOpacity: 0.4, background: [0, 0, 0, 0] })
    for (const [name, opacity] of Object.entries({
      half: 0.5,
      zero: 0,
      negative: -1,
      aboveOne: 2,
      nan: Number.NaN,
    })) {
      drawer.render({ copperPourOpacity: opacity })
      capture(name)
    }
    drawer.render({ copperPourOpacity: 0.5 })
    drawer.render({ transform: drawer.realToCanvasMat })
    capture("retained")
    drawer.render({ showCopperPours: false, copperPourOpacity: 1 })
    capture("hidden")
    drawer.render({ showCopperPours: true, copperPourOpacity: 0.5 })
    capture("shown")
    drawer.render({ xRayElementIds: ["pour_top"] })
    capture("xray")
    drawer.render({ copperPourOpacity: 0 })
    capture("xrayHidden")
    drawer.render({ xRayElementIds: ["covered-trace"], copperPourOpacity: 0.5 })
    capture("xrayTrace")
    drawer.drawElements(elements, {
      transform: drawer.realToCanvasMat,
      hiddenLayerOpacity: 0.4,
    })
    capture("independent")
    const geometryUploads = drawer.stats.geometryUploads
    const classicF1 = await checkClassicF1()
    return { frames, elements, geometryUploads, classicF1 }
  } finally {
    drawer.dispose()
  }
}
