import { appendFile, mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { ResvgRenderOptions } from "@resvg/resvg-js"
import { parse } from "opentype.js"
import { noteFontData } from "../../lib/text/note-font-data"

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

// Older revisions use resvg's system-font loading. Give both CI checkouts the
// same fontconfig directory so their references use identical font outlines.
export async function prepareSvgFontConfig(directory: string) {
  await mkdir(directory, { recursive: true })
  const font = await getSvgNoteFont(join(directory, "note.otf"))
  const config = join(directory, "fonts.conf")
  const escapedDirectory = dirname(config)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
  await writeFile(
    config,
    `<?xml version="1.0"?><fontconfig><dir>${escapedDirectory}</dir></fontconfig>\n`,
  )
  return { ...font, config }
}

if (import.meta.main) {
  const { config } = await prepareSvgFontConfig(
    fileURLToPath(new URL("../actual/parity/fonts/", import.meta.url)),
  )
  if (process.env.GITHUB_ENV)
    await appendFile(process.env.GITHUB_ENV, `FONTCONFIG_FILE=${config}\n`)
  console.log(`Deterministic SVG font config: ${config}`)
}
