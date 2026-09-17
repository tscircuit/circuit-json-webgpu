import type { NinePointAnchor, Point } from "circuit-json"
import type { AlphabetLayout } from "./getAlphabetLayout"
import { getAlphabetOutlineGroups } from "./getAlphabetOutlineGroups"
import { getPolygonBounds } from "./getPolygonBounds"

export type AnchorAlignment = NinePointAnchor

export interface TextBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface TextLinePlacement {
  line: string
  startX: number
  startY: number
}

export interface TextGeometry {
  bounds: TextBounds | null
  glyphGroups: Point[][][]
  linePlacements: TextLinePlacement[]
  startOffset: { x: number; y: number }
}

export function getTextStartPosition(
  alignment: NinePointAnchor,
  layout: AlphabetLayout,
  fontSize: number,
): { x: number; y: number } {
  return getTextGeometry(alignment, layout, fontSize).startOffset
}

export function getTextGeometry(
  alignment: NinePointAnchor,
  layout: AlphabetLayout,
  fontSize: number,
): TextGeometry {
  const baseLinePlacements = getBaseLinePlacements(alignment, layout)
  const baseGlyphGroups = getGlyphGroupsForLinePlacements(
    baseLinePlacements,
    layout,
    fontSize,
  )
  const baseBounds = getPolygonBounds(baseGlyphGroups.flat())
  const startOffset = getStartOffset(alignment, layout, baseBounds)

  return {
    bounds: baseBounds ? translateBounds(baseBounds, startOffset) : null,
    glyphGroups: translateGlyphGroups(baseGlyphGroups, startOffset),
    linePlacements: baseLinePlacements.map(({ line, startX, startY }) => ({
      line,
      startX: startX + startOffset.x,
      startY: startY + startOffset.y,
    })),
    startOffset,
  }
}

function getApproximateTextStartPosition(
  alignment: NinePointAnchor,
  layout: AlphabetLayout,
): { x: number; y: number } {
  const totalWidth = layout.width + layout.strokeWidth
  const totalHeight = layout.height + layout.strokeWidth

  let x = 0
  let y = 0

  // Horizontal alignment
  if (
    alignment === "center" ||
    alignment === "top_center" ||
    alignment === "bottom_center"
  ) {
    x = -totalWidth / 2
  } else if (
    alignment === "top_left" ||
    alignment === "bottom_left" ||
    alignment === "center_left"
  ) {
    x = 0
  } else if (
    alignment === "top_right" ||
    alignment === "bottom_right" ||
    alignment === "center_right"
  ) {
    x = -totalWidth
  } else if (alignment === "top_center" || alignment === "bottom_center") {
    x = -totalWidth / 2
  }

  // Vertical alignment
  if (
    alignment === "center" ||
    alignment === "center_left" ||
    alignment === "center_right"
  ) {
    y = -totalHeight / 2
  } else if (
    alignment === "top_left" ||
    alignment === "top_right" ||
    alignment === "top_center"
  ) {
    y = 0
  } else if (
    alignment === "bottom_left" ||
    alignment === "bottom_right" ||
    alignment === "bottom_center"
  ) {
    y = -totalHeight
  }

  return { x, y }
}

function getBaseLinePlacements(
  alignment: NinePointAnchor,
  layout: AlphabetLayout,
): TextLinePlacement[] {
  return layout.lines.map((line, lineIndex) => ({
    line,
    startX: getLineStartX({
      alignment,
      lineWidth: layout.lineWidths[lineIndex]!,
      maxWidth: layout.width,
      strokeWidth: layout.strokeWidth,
    }),
    startY: lineIndex * layout.lineHeight,
  }))
}

function getGlyphGroupsForLinePlacements(
  linePlacements: TextLinePlacement[],
  layout: AlphabetLayout,
  fontSize: number,
): Point[][][] {
  return linePlacements.flatMap(({ line, startX, startY }) =>
    getAlphabetOutlineGroups({
      line,
      fontSize,
      startX,
      startY,
      layout,
    }),
  )
}

function getStartOffset(
  alignment: NinePointAnchor,
  layout: AlphabetLayout,
  bounds: TextBounds | null,
): { x: number; y: number } {
  if (!bounds) {
    return getApproximateTextStartPosition(alignment, layout)
  }

  return {
    x: -getHorizontalAnchorPosition(alignment, bounds),
    y: -getVerticalAnchorPosition(alignment, bounds),
  }
}

function getHorizontalAnchorPosition(
  alignment: NinePointAnchor,
  bounds: Pick<TextBounds, "minX" | "maxX">,
): number {
  if (
    alignment === "top_left" ||
    alignment === "bottom_left" ||
    alignment === "center_left"
  ) {
    return bounds.minX
  }

  if (
    alignment === "top_right" ||
    alignment === "bottom_right" ||
    alignment === "center_right"
  ) {
    return bounds.maxX
  }

  return (bounds.minX + bounds.maxX) / 2
}

function getVerticalAnchorPosition(
  alignment: NinePointAnchor,
  bounds: Pick<TextBounds, "minY" | "maxY">,
): number {
  if (
    alignment === "top_left" ||
    alignment === "top_right" ||
    alignment === "top_center"
  ) {
    return bounds.minY
  }

  if (
    alignment === "bottom_left" ||
    alignment === "bottom_right" ||
    alignment === "bottom_center"
  ) {
    return bounds.maxY
  }

  return (bounds.minY + bounds.maxY) / 2
}

function translateGlyphGroups(
  glyphGroups: Point[][][],
  offset: { x: number; y: number },
): Point[][][] {
  if (offset.x === 0 && offset.y === 0) {
    return glyphGroups
  }

  return glyphGroups.map((group) =>
    group.map((polygon) =>
      polygon.map((point) => ({
        x: point.x + offset.x,
        y: point.y + offset.y,
      })),
    ),
  )
}

function translateBounds(
  bounds: TextBounds,
  offset: { x: number; y: number },
): TextBounds {
  return {
    minX: bounds.minX + offset.x,
    minY: bounds.minY + offset.y,
    maxX: bounds.maxX + offset.x,
    maxY: bounds.maxY + offset.y,
  }
}

export interface GetLineStartXParams {
  alignment: NinePointAnchor
  lineWidth: number
  maxWidth: number
  strokeWidth: number
}

export function getLineStartX(params: GetLineStartXParams): number {
  const { alignment, lineWidth, maxWidth, strokeWidth } = params
  const totalLineWidth = lineWidth + strokeWidth
  const totalMaxWidth = maxWidth + strokeWidth

  // For left-aligned text, lines start at x=0 (relative to the start position)
  if (
    alignment === "top_left" ||
    alignment === "bottom_left" ||
    alignment === "center_left"
  ) {
    return 0
  }

  // For right-aligned text, lines end at the same position
  if (
    alignment === "top_right" ||
    alignment === "bottom_right" ||
    alignment === "center_right"
  ) {
    return totalMaxWidth - totalLineWidth
  }

  // For center-aligned text, center each line
  return (totalMaxWidth - totalLineWidth) / 2
}
