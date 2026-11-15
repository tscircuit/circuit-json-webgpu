import { CircuitToWebGpuDrawer, DEFAULT_LAYER_COLORS } from "../../lib"
import { courtyardElements } from "../fixtures/courtyards"

const canvas = document.querySelector("canvas")!
const status = document.querySelector<HTMLElement>("#status")!
const visible = document.querySelector<HTMLInputElement>("#visible")!
const svg = document.querySelector<SVGSVGElement>("#expected")!
const ns = "http://www.w3.org/2000/svg"

// Independent SVG primitives illustrate the schema contract. No WebGPU
// geometry helper is reused to manufacture the expected result.
for (const element of courtyardElements) {
  const group = document.createElementNS(ns, "g")
  group.setAttribute("transform", "translate(440 210) scale(40 -40)")
  const fallback = DEFAULT_LAYER_COLORS[`${element.layer}_courtyard`]
  group.setAttribute(
    "stroke",
    "color" in element && element.color
      ? element.color
      : `rgb(${fallback
          .slice(0, 3)
          .map((v) => Math.round(v * 255))
          .join(",")})`,
  )
  group.setAttribute("stroke-width", "0.05")
  group.setAttribute("stroke-linejoin", "round")
  group.setAttribute("fill", "none")
  let primitive: SVGElement
  if (element.type === "pcb_courtyard_circle") {
    primitive = document.createElementNS(ns, "circle")
    primitive.setAttribute("cx", String(element.center.x))
    primitive.setAttribute("cy", String(element.center.y))
    primitive.setAttribute("r", String(element.radius))
  } else if (
    element.type === "pcb_courtyard_rect" ||
    element.type === "pcb_courtyard_pill"
  ) {
    primitive = document.createElementNS(ns, "rect")
    primitive.setAttribute("x", String(element.center.x - element.width / 2))
    primitive.setAttribute("y", String(element.center.y - element.height / 2))
    primitive.setAttribute("width", String(element.width))
    primitive.setAttribute("height", String(element.height))
    if (element.type === "pcb_courtyard_pill")
      primitive.setAttribute("rx", String(element.radius))
    else
      primitive.setAttribute(
        "transform",
        `rotate(${element.ccw_rotation ?? 0} ${element.center.x} ${element.center.y})`,
      )
  } else {
    primitive = document.createElementNS(ns, "polygon")
    const points =
      element.type === "pcb_courtyard_outline"
        ? element.outline
        : element.points
    primitive.setAttribute(
      "points",
      points.map((p) => `${p.x},${p.y}`).join(" "),
    )
  }
  group.append(primitive)
  svg.append(group)
}

declare global {
  interface Window {
    courtyardRepro?: {
      drawer: CircuitToWebGpuDrawer
      render: (show: boolean) => Promise<void>
    }
  }
}

try {
  const drawer = await CircuitToWebGpuDrawer.create(canvas)
  const render = async (show: boolean) => {
    drawer.drawElements(courtyardElements, {
      transform: { a: 40, b: 0, c: 0, d: -40, e: 440, f: 210 },
      layers: ["top_courtyard", "bottom_courtyard"],
      selectedLayer: "top",
      hiddenLayerOpacity: 1,
      showCourtyards: show,
      background: [9 / 255, 12 / 255, 18 / 255, 1],
    })
    await drawer.flush()
    status.textContent = JSON.stringify(
      {
        elements: courtyardElements.length,
        triangles: drawer.stats.triangleCount,
        diagnostics: drawer.diagnostics,
      },
      null,
      2,
    )
  }
  await render(true)
  visible.onchange = () => {
    void render(visible.checked)
  }
  window.addEventListener("pagehide", () => drawer.dispose(), { once: true })
  window.courtyardRepro = { drawer, render }
} catch (error) {
  status.textContent = String(error)
  throw error
}
