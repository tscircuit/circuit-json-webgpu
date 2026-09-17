import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement, PcbVia } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import { identity } from "transformation-matrix"
import { drawText } from "../../lib/drawer/shapes/text"
import { DEFAULT_PCB_COLOR_MAP } from "../../lib/drawer/types"

test("via soldermask respects per-side tenting, legacy overrides, and physical layers", async () => {
  const overview = createCanvas(400, 240)
  const overviewCtx = overview.getContext("2d")
  for (const layer of ["top", "bottom"] as const) {
    for (const layers of [
      ["top", "bottom"],
      ["top", "inner1"],
      ["inner1", "bottom"],
      ["inner1", "inner2"],
    ] as PcbVia["layers"][]) {
      for (const connected of [false, true]) {
        for (const legacy of [undefined, false, true]) {
          for (const top of [undefined, false, true]) {
            for (const bottom of [undefined, false, true]) {
              const canvas = createCanvas(100, 100)
              const ctx = canvas.getContext("2d")
              const drawer = new CircuitToCanvasDrawer(ctx)
              drawer.configure({
                colorOverrides: {
                  soldermask: { top: "#00ff00", bottom: "#00ff00" },
                  soldermaskOverCopper: { top: "#008800", bottom: "#008800" },
                  copper: {
                    ...DEFAULT_PCB_COLOR_MAP.copper,
                    top: "#ff0000",
                    bottom: "#0000ff",
                  },
                  drill: "#ffffff",
                },
              })
              const elements: AnyCircuitElement[] = [
                {
                  type: "pcb_board",
                  pcb_board_id: "board",
                  center: { x: 50, y: 50 },
                  width: 100,
                  height: 100,
                  num_layers: 4,
                  thickness: 1.6,
                  material: "fr4",
                },
                {
                  type: "pcb_via",
                  pcb_via_id: "via",
                  x: 50,
                  y: 50,
                  outer_diameter: 40,
                  hole_diameter: 20,
                  layers,
                  tented_on_top: top,
                  tented_on_bottom: bottom,
                  ...{ is_tented: legacy },
                },
              ]
              if (connected)
                elements.push({
                  type: "pcb_trace",
                  pcb_trace_id: "trace",
                  route: [
                    { route_type: "wire", x: 10, y: 50, layer, width: 4 },
                    { route_type: "wire", x: 50, y: 50, layer, width: 4 },
                  ],
                })
              drawer.drawElements(elements, {
                layers: [layer === "top" ? "top_copper" : "bottom_copper"],
                drawSoldermask: true,
                drawSoldermaskTop: layer === "top",
                drawSoldermaskBottom: layer === "bottom",
              })
              const isTented =
                (layer === "top" ? top : bottom) ?? legacy ?? false
              const pixel = (x: number) =>
                Array.from(ctx.getImageData(x, 50, 1, 1).data)
              if (layers.includes(layer)) {
                expect(pixel(50)).toEqual(
                  isTented ? [0, 136, 0, 255] : [255, 255, 255, 255],
                )
                expect(pixel(65)).toEqual(
                  isTented
                    ? [0, 136, 0, 255]
                    : layer === "top"
                      ? [255, 0, 0, 255]
                      : [0, 0, 255, 255],
                )
              } else {
                expect(pixel(65)).toEqual([0, 255, 0, 255])
              }
              if (
                layers.length === 2 &&
                layers[0] === "top" &&
                layers[1] === "bottom" &&
                !connected &&
                legacy === undefined &&
                top !== undefined &&
                bottom !== undefined
              ) {
                const col = Number(top) * 2 + Number(bottom)
                const row = layer === "top" ? 0 : 1
                overviewCtx.drawImage(canvas, col * 100, row * 120)
                drawText({
                  ctx: overviewCtx,
                  text: `${layer}: T=${Number(top)} B=${Number(bottom)}`,
                  x: col * 100 + 50,
                  y: row * 120 + 110,
                  fontSize: 8,
                  color: "white",
                  realToCanvasMat: identity(),
                  anchorAlignment: "center",
                })
              }
            }
          }
        }
      }
    }
  }
  await expect(overview.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
