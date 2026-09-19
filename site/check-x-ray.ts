import { CircuitToWebGpuDrawer, type CircuitJson } from "../lib"

export async function checkXRay() {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 200
  const drawer = await CircuitToWebGpuDrawer.create(canvas)
  const layers = ["bottom", "inner1", "top"]
  const elements = layers.flatMap((layer, i) => [
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: `pad_${layer}`,
      shape: "rect",
      x: -6 + i * 6,
      y: 5,
      width: 2,
      height: 2,
      layer,
    },
    {
      type: "pcb_trace",
      pcb_trace_id: `trace_${layer}`,
      route: [
        { route_type: "wire", x: -5, y: 0, width: 2, layer },
        { route_type: "wire", x: 5, y: 0, width: 2, layer },
      ],
    },
  ]) as CircuitJson
  const unrelated = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "other",
    shape: "rect",
    x: 0,
    y: -5,
    width: 2,
    height: 2,
    layer: "top",
  } as const
  const drills = ["pcb_via", "pcb_plated_hole"].flatMap((type, i) =>
    ["selected", "unrelated"].map((net, j) => ({
      type,
      [`${type}_id`]: `${net}_${type}`,
      shape: "circle",
      x: -6 + i * 12,
      y: -3 - j * 4,
      outer_diameter: 2,
      hole_diameter: 1,
      layers: ["top", "bottom"],
    })),
  ) as CircuitJson
  const capture = () => canvas.toDataURL("image/png").split(",")[1]
  try {
    const annotations = [
      "silkscreen",
      "fabrication_note",
      "note",
      "courtyard",
    ].map((group, i) => ({
      type: `pcb_${group}_line`,
      layer: "top",
      start: { x: -7 + i * 4, y: 8 },
      end: { x: -5 + i * 4, y: 8 },
      stroke_width: 1,
    })) as unknown as CircuitJson
    drawer.drawElements([...elements, unrelated, ...annotations, ...drills], {
      showSilkscreen: true,
      showFabricationNotes: true,
      showPcbNotes: true,
      showCourtyards: true,
      transform: { a: 10, b: 0, c: 0, d: -10, e: 100, f: 100 },
      hiddenLayerOpacity: 0,
    })
    const ids = [
      ...layers.flatMap((layer) => [`pad_${layer}`, `trace_${layer}`]),
      "selected_pcb_via",
      "selected_pcb_plated_hole",
    ]
    const frames: Record<string, string> = {}
    frames.before = capture()
    for (const selectedLayer of layers) {
      drawer.render({ selectedLayer, xRayElementIds: ids })
      frames[selectedLayer] = capture()
    }
    drawer.render({ selectedLayer: "top", hiddenLayerOpacity: 0.05 })
    frames.fivePercent = capture()
    drawer.render({ selectedLayer: "top", hiddenLayerOpacity: 0.4 })
    frames.dimmed = capture()
    drawer.render({
      highlightedElementIds: ["other", "pad_bottom", "trace_top"],
    })
    frames.hover = capture()
    drawer.render({ xRayElementIds: ["pad_bottom"] })
    frames.changed = capture()
    drawer.render({ hiddenLayerOpacity: 0, xRayElementIds: [] })
    frames.exit = capture()
    drawer.render({ xRayElementIds: ids, layers: ["bottom_copper"] })
    frames.filtered = capture()
    canvas.width = 220
    drawer.render({ layers: undefined })
    frames.resized = capture()
    await drawer.flush()
    return { frames, geometryUploads: drawer.stats.geometryUploads }
  } finally {
    drawer.dispose()
  }
}
