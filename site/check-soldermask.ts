import {
  CircuitToWebGpuDrawer,
  type CircuitJson,
  type RenderOptions,
} from "../lib"

// A single board exercises the same top/bottom mask toggles without recompiling.
export const soldermaskRegression: CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 20,
    height: 16,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
    default_via_tented_on_top: true,
    default_via_tented_on_bottom: false,
  },
  {
    type: "pcb_via",
    pcb_via_id: "inherited",
    x: -6,
    y: 3,
    hole_diameter: 1,
    outer_diameter: 2,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "route-via",
    route: [
      { route_type: "wire", x: -2, y: 3, layer: "top", width: 0.4 },
      {
        route_type: "via",
        x: 0,
        y: 3,
        from_layer: "top",
        to_layer: "bottom",
        hole_diameter: 1,
        outer_diameter: 2,
      },
      { route_type: "wire", x: 2, y: 3, layer: "bottom", width: 0.4 },
    ],
  },
  {
    type: "pcb_via",
    pcb_via_id: "exposed",
    x: 6,
    y: 3,
    hole_diameter: 1,
    outer_diameter: 2,
    layers: ["top", "bottom"],
    tented_on_top: false,
    tented_on_bottom: false,
  },
  {
    type: "pcb_via",
    pcb_via_id: "overlapping-pad",
    x: 6,
    y: -3,
    hole_diameter: 1,
    outer_diameter: 2,
    layers: ["top", "bottom"],
    tented_on_top: true,
    tented_on_bottom: true,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "opening",
    pcb_component_id: "component",
    shape: "rect",
    x: 4.75,
    y: -3,
    width: 2.5,
    height: 2,
    layer: "top",
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "top-trace",
    route: [
      { route_type: "wire", x: -7, y: -3, layer: "top", width: 0.5 },
      { route_type: "wire", x: -3, y: -3, layer: "top", width: 0.5 },
    ],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "bottom-trace",
    route: [
      { route_type: "wire", x: -7, y: -3, layer: "bottom", width: 0.5 },
      { route_type: "wire", x: -3, y: -3, layer: "bottom", width: 0.5 },
    ],
  },
  {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour",
    covered_with_solder_mask: true,
    layer: "top",
    shape: "rect",
    center: { x: 0, y: -3 },
    width: 2,
    height: 2,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "mounting",
    hole_shape: "circle",
    hole_diameter: 1,
    x: 0,
    y: -6,
  },
  {
    type: "pcb_cutout",
    pcb_cutout_id: "cutout",
    shape: "rect",
    center: { x: 3, y: -6 },
    width: 1,
    height: 1,
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "top-v1",
    pcb_component_id: "component",
    layer: "top",
    text: "V1",
    anchor_position: { x: -6, y: 3 },
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 1.6,
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "top-v2",
    pcb_component_id: "component",
    layer: "top",
    text: "V2",
    anchor_position: { x: 0, y: 3 },
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 1.6,
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "top-v3",
    pcb_component_id: "component",
    layer: "top",
    text: "V3",
    anchor_position: { x: 6, y: 3 },
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 1.6,
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "bottom-v1",
    pcb_component_id: "component",
    layer: "bottom",
    text: "V1",
    anchor_position: { x: -6, y: 3 },
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 1.6,
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "bottom-v2",
    pcb_component_id: "component",
    layer: "bottom",
    text: "V2",
    anchor_position: { x: 0, y: 3 },
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 1.6,
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "bottom-v3",
    pcb_component_id: "component",
    layer: "bottom",
    text: "V3",
    anchor_position: { x: 6, y: 3 },
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 1.6,
  },
]

export async function checkSoldermask() {
  const canvas = document.createElement("canvas")
  canvas.width = 800
  canvas.height = 640
  const drawer = await CircuitToWebGpuDrawer.create(canvas)
  const frames: Record<string, string> = {}
  const capture = (name: string, options: RenderOptions) => {
    drawer.render(options)
    frames[name] = canvas.toDataURL("image/png").split(",")[1]
  }
  try {
    drawer.setCircuitJson(soldermaskRegression)
    capture("top", {
      transform: { a: 36, b: 0, c: 0, d: -36, e: 400, f: 320 },
      selectedLayer: "top",
      showSolderMask: true,
      showBoardMaterial: true,
      showSilkscreen: true,
      hiddenLayerOpacity: 0,
      background: [0, 0, 0, 1],
    })
    capture("bottom", { selectedLayer: "bottom" })
    capture("bottom-mask-off", { showSolderMask: false })
    capture("top-mask-off", { selectedLayer: "top" })
    capture("filtered-mask", { showSolderMask: true, layers: ["top", "drill"] })
    capture("hidden-pours", { layers: undefined, showCopperPours: false })
    capture("half-pours", { showCopperPours: true, copperPourOpacity: 0.5 })
    capture("xray", { xRayElementIds: ["inherited", "route-via"] })
    capture("restored", { xRayElementIds: [], copperPourOpacity: 1 })
    capture("top-without-drill", {
      layers: ["top", "board", "edge_cuts", "soldermask_top", "top_silkscreen"],
    })
    capture("top-mask-off-without-drill", { showSolderMask: false })
    const geometryUploads = drawer.stats.geometryUploads
    drawer.setCircuitJson([...soldermaskRegression].reverse())
    capture("reversed", { layers: undefined, showSolderMask: true })
    drawer.setCircuitJson(
      soldermaskRegression.map((element) =>
        element.type === "pcb_copper_pour"
          ? { ...element, covered_with_solder_mask: false }
          : element,
      ),
    )
    capture("exposed-pour", {})
    capture("exposed-pour-mask-off", { showSolderMask: false })
    return { frames, geometryUploads, diagnostics: drawer.diagnostics }
  } finally {
    drawer.dispose()
  }
}
