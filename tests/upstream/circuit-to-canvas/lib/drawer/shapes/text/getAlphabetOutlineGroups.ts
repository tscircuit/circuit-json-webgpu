import glyphOutlineAlphabet from "@tscircuit/alphabet/outline-polygons"
import type { Point } from "circuit-json"
import {
  getAlphabetAdvanceWidth,
  type AlphabetLayout,
} from "./getAlphabetLayout"

export interface GlyphOutlineLineParams {
  line: string
  fontSize: number
  startX: number
  startY: number
  layout: AlphabetLayout
}

export function getAlphabetOutlineGroups(
  params: GlyphOutlineLineParams,
): Point[][][] {
  const { line, fontSize, startX, startY } = params
  const height = fontSize
  const glyphScaleX = fontSize
  const characters = Array.from(line)
  const groups: Point[][][] = []
  let cursor = startX + params.layout.strokeWidth / 2

  characters.forEach((char, index) => {
    const glyphRings = glyphOutlineAlphabet[char]
    if (glyphRings?.length) {
      const rings: Point[][] = []
      for (const ring of glyphRings) {
        const points = ring.map((point) => ({
          x: cursor + point.x * glyphScaleX,
          y: startY + (1 - point.y) * height,
        }))
        if (points.length >= 3) rings.push(points)
      }
      if (rings.length > 0) groups.push(rings)
    }

    cursor += getAlphabetAdvanceWidth(char, characters[index + 1], fontSize)
  })

  return groups
}
