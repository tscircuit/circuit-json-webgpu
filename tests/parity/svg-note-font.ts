import { writeFile } from "node:fs/promises"
import { Resvg, type ResvgRenderOptions } from "@resvg/resvg-js"
import { parse } from "opentype.js"
import { noteFontData } from "../../lib/text/note-font-data"
import type { CapturedCase } from "./types"

/** Use the bundled font in both renderers, independent of installed OS fonts. */
export async function getSvgNoteFont(path: string) {
  const font = parse(
    Uint8Array.from(Buffer.from(noteFontData, "base64")).buffer,
  )
  // Both renderers receive exactly the same OpenType data.
  const data = Buffer.from(font.toArrayBuffer())
  await writeFile(path, data)
  const options: ResvgRenderOptions = {
    font: {
      fontFiles: [path],
      loadSystemFonts: false,
      defaultFontFamily: "Liberation Sans",
      sansSerifFamily: "Liberation Sans",
    },
  }
  return { data, options }
}

export function renderSvgReference(
  svg: string,
  elements: CapturedCase["elements"],
  noteFontOptions: ResvgRenderOptions,
) {
  const hasNoteText = elements.some((e) => e.type === "pcb_note_text")
  return new Resvg(svg, hasNoteText ? noteFontOptions : undefined)
    .render()
    .asPng()
}
