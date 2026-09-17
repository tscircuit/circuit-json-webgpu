import { lineAlphabet } from "@tscircuit/alphabet"
import { DEFAULT_LAYER_COLORS, normalizeLayer } from "./colors"
import {
  ellipse,
  expandBrepRing,
  MeshBuilder,
  rectangle,
  rotate,
} from "./geometry"
import type { CircuitJson, CompiledScene, Diagnostic, Point } from "./types"

type Element = Record<string, any>
export function getElementId(element: Element, index = 0): string {
  return element[`${element.type}_id`] ?? `${element.type}:${index}`
}
function center(e: Element): Point {
  return e.center ?? e.anchor_position ?? { x: e.x ?? 0, y: e.y ?? 0 }
}
function shape(e: Element, hole = false): Point[][] {
  if (e.brep_shape)
    return [e.brep_shape.outer_ring, ...(e.brep_shape.inner_rings ?? [])].map(
      (r) => expandBrepRing(r.vertices),
    )
  if (e.outline?.length) return [e.outline]
  const kind = hole ? (e.hole_shape ?? e.shape) : e.shape
  if (kind === "polygon") return [e.points ?? e.vertices ?? []]
  const base = center(e),
    rotation = e.rect_ccw_rotation ?? e.ccw_rotation ?? e.rotation ?? 0
  const c = hole
    ? rotate(
        {
          x: base.x + (e.hole_offset_x ?? 0),
          y: base.y + (e.hole_offset_y ?? 0),
        },
        base,
        rotation,
      )
    : base
  if (
    kind === "circle" ||
    (kind === "circular_hole_with_rect_pad" && hole) ||
    e.type === "pcb_via"
  ) {
    const diameter = hole
      ? e.hole_diameter
      : (e.outer_diameter ?? (e.radius != null ? e.radius * 2 : e.diameter))
    return [
      ellipse(c, diameter || e.diameter || e.hole_diameter || e.radius * 2),
    ]
  }
  const width = hole
    ? (e.hole_width ?? e.hole_diameter)
    : (e.rect_pad_width ?? e.outer_width ?? e.width)
  const height = hole
    ? (e.hole_height ?? e.hole_diameter)
    : (e.rect_pad_height ?? e.outer_height ?? e.height)
  if (kind === "oval") return [ellipse(c, width, height, rotation)]
  if (
    [
      "rect",
      "rotated_rect",
      "roundrect",
      "rounded_rect",
      "pill",
      "rotated_pill",
      "circular_hole_with_rect_pad",
      "pill_hole_with_rect_pad",
      undefined,
    ].includes(kind)
  ) {
    const pill =
      kind?.includes("pill") && !(kind === "pill_hole_with_rect_pad" && !hole)
    const radius = pill
      ? Math.min(width, height) / 2
      : (e.corner_radius ?? e.rect_border_radius ?? 0)
    return [rectangle(c, width, height, radius, rotation)]
  }
  throw new Error(`Unsupported shape: ${kind}`)
}
function drawText(mesh: MeshBuilder, e: Element) {
  if (e.is_knockout) throw new Error("Knockout text is not supported yet")
  const c = center(e),
    height = (e.font_size ?? e.size ?? 1) * 0.7
  const lines = String(e.text ?? "").split(/\r?\n/),
    step = height * 0.8
  const maxWidth = Math.max(
    ...lines.map((l) => Math.max(0, l.length * step - height * 0.2)),
  )
  const totalHeight = lines.length * height + (lines.length - 1) * height * 0.2
  const align: string = e.anchor_alignment ?? "center"
  const dx = align.includes("left")
    ? 0
    : align.includes("right")
      ? -maxWidth
      : -maxWidth / 2
  const dy = align.startsWith("top")
    ? -height
    : align.startsWith("bottom")
      ? totalHeight - height
      : totalHeight / 2 - height
  const mirrored = e.is_mirrored ?? e.layer === "bottom"
  const transform = (p: Point) =>
    rotate(
      { x: c.x + (mirrored ? -p.x : p.x), y: c.y + p.y },
      c,
      e.ccw_rotation ?? 0,
    )
  for (const [row, line] of lines.entries()) {
    const width = Math.max(0, line.length * step - height * 0.2)
    for (const [col, char] of [...line].entries()) {
      for (const segment of lineAlphabet[char] ??
        lineAlphabet[char.toUpperCase()] ??
        []) {
        const x = dx + (maxWidth - width) / 2 + col * step,
          y = dy - row * height * 1.2
        mesh.line(
          transform({
            x: x + segment.x1 * height * 0.6,
            y: y + segment.y1 * height,
          }),
          transform({
            x: x + segment.x2 * height * 0.6,
            y: y + segment.y2 * height,
          }),
          e.stroke_width ?? height / 12,
        )
      }
    }
  }
}

/** Pure, DOM-free compiler. Exposes unsupported geometry rather than silently hiding it. */
export function compileCircuitJson(elements: CircuitJson): CompiledScene {
  const builders = new Map<string, { paint: MeshBuilder; erase: MeshBuilder }>()
  const diagnostics: Diagnostic[] = [],
    elementIds = elements.map(getElementId)
  const board = elements.find((e) => e.type === "pcb_board") as
    | Element
    | undefined
  const copper = [
    "top",
    ...Array.from(
      { length: Math.max(0, Math.min(8, (board?.num_layers ?? 2) - 2)) },
      (_, i) => `inner${i + 1}`,
    ),
    "bottom",
  ]
  const get = (name: string, index: number, erase = false, category = 0) => {
    name = normalizeLayer(name)
    if (!builders.has(name))
      builders.set(name, { paint: new MeshBuilder(), erase: new MeshBuilder() })
    const mesh = builders.get(name)![erase ? "erase" : "paint"]
    mesh.color = DEFAULT_LAYER_COLORS[name] ?? [0.75, 0.75, 0.75, 1]
    mesh.element = index
    mesh.category = category
    return mesh
  }
  const openings: { element: Element; index: number; layers: string[] }[] = []
  const cutouts: { rings: Point[][]; index: number }[] = []
  for (const [index, input] of elements.entries()) {
    const e = input as Element,
      type: string = e.type
    try {
      if (type === "pcb_board" || type === "pcb_panel") {
        const rings = shape(e)
        get("board", index).polygon(rings)
        for (const side of ["top", "bottom"])
          get(`soldermask_${side}`, index).polygon(rings)
      } else if (type === "pcb_cutout") {
        cutouts.push({ rings: shape(e), index })
        get("edge_cuts", index).path(shape(e)[0], 0.05, true)
      } else if (type === "pcb_smtpad") {
        get(e.layer, index).polygon(shape(e))
        if (!e.is_covered_with_solder_mask)
          get(`soldermask_${e.layer}`, index, true).polygon(shape(e))
      } else if (type === "pcb_via" || type === "pcb_plated_hole") {
        let layers: string[] = e.layers ?? copper
        if (type === "pcb_via" && !e.layers && e.from_layer && e.to_layer) {
          const from = copper.indexOf(e.from_layer),
            to = copper.indexOf(e.to_layer)
          layers = copper.slice(Math.min(from, to), Math.max(from, to) + 1)
        }
        for (const layer of layers) get(layer, index).polygon(shape(e))
        openings.push({ element: e, index, layers })
        for (const side of ["top", "bottom"])
          if (layers.includes(side) && !e.is_covered_with_solder_mask)
            get(`soldermask_${side}`, index, true).polygon(shape(e))
      } else if (type === "pcb_hole") {
        openings.push({
          element: { ...e, shape: e.hole_shape },
          index,
          layers: copper,
        })
      } else if (type === "pcb_trace") {
        const route = e.route ?? []
        if (
          e.route_thickness_mode === "interpolated" ||
          route.some((p: Element) => p.route_type === "through_pad")
        )
          throw new Error(
            "Interpolated/through-pad traces are not supported yet",
          )
        for (let i = 1; i < route.length; i++) {
          const a = route[i - 1],
            b = route[i]
          // Connect wires to a via on the adjacent copper layer, but never
          // connect two unrelated runs across a layer transition.
          const layer =
            a.route_type === "wire" &&
            b.route_type === "wire" &&
            a.layer === b.layer
              ? a.layer
              : a.route_type === "wire" &&
                  b.route_type === "via" &&
                  [b.from_layer, b.to_layer].includes(a.layer)
                ? a.layer
                : a.route_type === "via" &&
                    b.route_type === "wire" &&
                    [a.from_layer, a.to_layer].includes(b.layer)
                  ? b.layer
                  : undefined
          if (layer) get(layer, index).line(a, b, a.width ?? b.width ?? 0.15)
        }
      } else if (type === "pcb_copper_pour") {
        get(e.layer, index, false, 1).polygon(shape(e))
      } else if (type === "pcb_copper_text") {
        drawText(get(e.layer, index), e)
      } else if (
        /^pcb_(silkscreen|fabrication_note|courtyard|note|user_note)_/.test(
          type,
        )
      ) {
        const group = type.match(
          /^pcb_(silkscreen|fabrication_note|courtyard|note|user_note)_/,
        )![1]
        const suffix = {
          silkscreen: "silkscreen",
          fabrication_note: "fabrication",
          courtyard: "courtyard",
          note: "notes",
          user_note: "notes",
        }[group]!
        const layer = `${e.layer ?? "top"}_${suffix}`,
          mesh = get(layer, index)
        if (type.endsWith("_text")) drawText(mesh, e)
        else if (
          type.endsWith("_path") ||
          type.endsWith("_line") ||
          type.endsWith("_outline")
        ) {
          const points =
            e.route ?? e.points ?? e.outline ?? [e.start, e.end].filter(Boolean)
          mesh.path(
            points,
            e.stroke_width ?? e.width ?? 0.05,
            type.endsWith("_outline"),
          )
        } else if (type.endsWith("_rect")) {
          const points = rectangle(
            center(e),
            e.width,
            e.height,
            e.corner_radius ?? 0,
            e.ccw_rotation ?? 0,
          )
          if (e.is_filled) mesh.polygon([points])
          else mesh.path(points, e.stroke_width ?? 0.05, true)
        } else if (type.endsWith("_circle")) {
          const points = ellipse(center(e), (e.radius ?? 0) * 2)
          if (e.is_filled) mesh.polygon([points])
          else mesh.path(points, e.stroke_width ?? 0.05, true)
        } else throw new Error("Unsupported annotation geometry")
      } else if (type === "pcb_keepout") {
        for (const layer of e.layers ?? [e.layer ?? "top"])
          get(layer, index).path(shape(e)[0], e.stroke_width ?? 0.1, true)
      } else if (
        type.startsWith("pcb_") &&
        ![
          "pcb_component",
          "pcb_port",
          "pcb_group",
          "pcb_solder_paste",
          "pcb_debug_object",
          "pcb_trace_hint",
          "pcb_anchor",
        ].includes(type) &&
        !/_(error|warning)$/.test(type)
      ) {
        throw new Error("Unsupported PCB element")
      }
    } catch (error) {
      diagnostics.push({
        elementId: elementIds[index],
        type,
        message: String(error),
      })
    }
  }
  for (const { element, index, layers } of openings) {
    const rings = shape(element, true)
    for (const layer of layers) get(layer, index, true).polygon(rings)
    const isThrough = layers.includes("top") && layers.includes("bottom")
    if (isThrough) {
      get("board", index, true).polygon(rings)
      get("drill", index).polygon(rings)
    }
    for (const side of ["top", "bottom"])
      if (layers.includes(side))
        get(`soldermask_${side}`, index, true).polygon(rings)
  }
  for (const { rings, index } of cutouts)
    for (const name of builders.keys())
      if (name !== "edge_cuts") get(name, index, true).polygon(rings)
  const layers = [...builders].map(([name, mesh]) => ({
    name,
    paint: mesh.paint.build(),
    erase: mesh.erase.build(),
  }))
  return {
    layers,
    elementIds,
    diagnostics,
    triangleCount: layers.reduce(
      (sum, l) => sum + (l.paint.indices.length + l.erase.indices.length) / 3,
      0,
    ),
  }
}
