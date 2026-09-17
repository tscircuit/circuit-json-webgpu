import {
  glyphAdvanceRatio,
  kerningRatio,
  textMetrics,
} from "@tscircuit/alphabet"

export type AlphabetLayout = {
  width: number
  height: number
  glyphWidth: number
  letterSpacing: number
  spaceWidth: number
  strokeWidth: number
  lineHeight: number
  lines: string[]
  lineWidths: number[]
}

const getAdvanceRatio = (char: string): number =>
  glyphAdvanceRatio[char] ??
  (char === " " ? textMetrics.spaceWidthRatio : textMetrics.glyphWidthRatio)

export function getAlphabetAdvanceWidth(
  char: string,
  nextChar: string | undefined,
  fontSize: number,
): number {
  const advanceRatio = getAdvanceRatio(char)
  const letterSpacingRatio = nextChar ? textMetrics.letterSpacingRatio : 0
  const kerningAdjustmentRatio = nextChar
    ? (kerningRatio[char]?.[nextChar] ?? 0)
    : 0

  return fontSize * (advanceRatio + letterSpacingRatio + kerningAdjustmentRatio)
}

export function getAlphabetLayout(
  text: string,
  fontSize: number,
): AlphabetLayout {
  const glyphWidth = fontSize * textMetrics.glyphWidthRatio
  const letterSpacing = fontSize * textMetrics.letterSpacingRatio
  const spaceWidth = fontSize * textMetrics.spaceWidthRatio
  const strokeWidth = fontSize * textMetrics.strokeWidthRatio
  const lineHeight = fontSize * textMetrics.lineHeightRatio

  const lines = text.replace(/\\n/g, "\n").split("\n")
  const lineWidths = lines.map((line) => {
    const characters = Array.from(line)
    return characters.reduce(
      (sum, char, index) =>
        sum + getAlphabetAdvanceWidth(char, characters[index + 1], fontSize),
      0,
    )
  })

  const width = lineWidths.reduce(
    (maxWidth, lineWidth) => Math.max(maxWidth, lineWidth),
    0,
  )

  const height =
    lines.length > 1 ? fontSize + (lines.length - 1) * lineHeight : fontSize

  return {
    width,
    height,
    glyphWidth,
    letterSpacing,
    spaceWidth,
    strokeWidth,
    lineHeight,
    lines,
    lineWidths,
  }
}
