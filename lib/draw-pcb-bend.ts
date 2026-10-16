import { glyphAdvanceRatio, textMetrics } from "@tscircuit/alphabet"
import type { PcbBend, PcbBoard } from "circuit-json"
import { type MeshBuilder, rectangle } from "./geometry"
import { drawText } from "./text/draw-text"
import type { DrawerOptions } from "./types"

const LABEL = "BEND LINE"
const LABEL_WIDTH = Array.from(LABEL).reduce(
  (width, character) =>
    width + (glyphAdvanceRatio[character] ?? textMetrics.spaceWidthRatio),
  0,
)

/** Flat mechanical overlay, using the same dimensions as circuit-to-svg. */
export function drawPcbBend(
  mesh: MeshBuilder,
  bend: PcbBend,
  board: PcbBoard,
  textYAxis: DrawerOptions["textYAxis"] = "up",
) {
  // Endpoints are relative to the owning board center. Group transforms have
  // already been resolved by the producer and must not be applied again.
  const start = {
    x: board.center.x + bend.start.x,
    y: board.center.y + bend.start.y,
  }
  const end = {
    x: board.center.x + bend.end.x,
    y: board.center.y + bend.end.y,
  }
  const dx = end.x - start.x,
    dy = end.y - start.y,
    length = Math.hypot(dx, dy)
  if (
    ![start.x, start.y, end.x, end.y, length].every(Number.isFinite) ||
    length === 0
  )
    throw new Error("Bend centerline endpoints must be finite and distinct")

  const ux = dx / length,
    uy = dy / length,
    rotation = (Math.atan2(dy, dx) * 180) / Math.PI
  // Butt caps keep each dash inside the finite segment, including short bends.
  for (let offset = 0; offset < length; offset += 0.75 + 0.4) {
    const stop = Math.min(offset + 0.75, length)
    const midpoint = (offset + stop) / 2
    mesh.polygon([
      rectangle(
        {
          x: start.x + ux * midpoint,
          y: start.y + uy * midpoint,
        },
        stop - offset,
        0.15,
        0,
        rotation,
      ),
    ])
  }

  // Normalize the baseline in screen coordinates so reversing endpoints does
  // not turn the label upside down or move it to the other side of the line.
  const ySign = textYAxis === "up" ? -1 : 1
  let angle = Math.atan2(ySign * dy, dx)
  if (angle >= Math.PI / 2) angle -= Math.PI
  if (angle < -Math.PI / 2) angle += Math.PI
  const fontSize = Math.min(0.5, (length * 0.8) / LABEL_WIDTH)
  const offset = fontSize * 0.6 + 0.2
  drawText(
    mesh,
    {
      type: "pcb_bend_label",
      text: LABEL,
      font_size: fontSize,
      anchor_alignment: "center",
      anchor_position: {
        x: (start.x + end.x) / 2 + Math.sin(angle) * offset,
        y: (start.y + end.y) / 2 - ySign * Math.cos(angle) * offset,
      },
      ccw_rotation: (-angle * 180) / Math.PI,
    },
    textYAxis,
  )
}
