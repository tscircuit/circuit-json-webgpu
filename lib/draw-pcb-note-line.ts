import type { PcbNoteLine } from "circuit-json"
import type { MeshBuilder } from "./geometry"

// Millimetres; match circuit-to-svg's createSvgObjectsFromPcbNoteLine pattern.
const NOTE_LINE_DASH_LENGTH = 0.2
const NOTE_LINE_GAP_LENGTH = 0.1

export function drawPcbNoteLine({
  mesh,
  line,
}: { mesh: MeshBuilder; line: PcbNoteLine }) {
  const start = { x: line.x1, y: line.y1 }
  const end = { x: line.x2, y: line.y2 }
  const width = line.stroke_width ?? 0.1
  if (!(width > 0)) return
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy)
  if (!line.is_dashed || length === 0) {
    mesh.line(start, end, width)
    return
  }
  for (
    let offset = 0;
    offset < length;
    offset += NOTE_LINE_DASH_LENGTH + NOTE_LINE_GAP_LENGTH
  ) {
    const dashEnd = Math.min(offset + NOTE_LINE_DASH_LENGTH, length)
    mesh.line(
      {
        x: start.x + (dx * offset) / length,
        y: start.y + (dy * offset) / length,
      },
      {
        x: start.x + (dx * dashEnd) / length,
        y: start.y + (dy * dashEnd) / length,
      },
      width,
    )
  }
}
