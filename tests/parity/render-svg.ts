import { createHash } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { Resvg } from "@resvg/resvg-js"

const fonts = new Map<string, Promise<string>>()

/** Resvg does not load CSS @font-face URLs; use the font embedded by circuit-to-svg. */
export async function renderSvg(svg: string): Promise<Buffer> {
  const encoded = svg.match(/data:font\/ttf;base64,([^']+)/)?.[1]
  if (!encoded) throw new Error("Reference SVG is missing its alphabet font")
  let font = fonts.get(encoded)
  if (!font) {
    font = (async () => {
      const buffer = Buffer.from(encoded, "base64")
      const hash = createHash("sha256").update(buffer).digest("hex")
      const directory = new URL("../actual/parity/fonts/", import.meta.url)
      await mkdir(directory, { recursive: true })
      const path = new URL(`${hash}.ttf`, directory)
      await writeFile(path, buffer)
      return fileURLToPath(path)
    })()
    fonts.set(encoded, font)
  }
  return new Resvg(svg, {
    font: {
      loadSystemFonts: false,
      fontFiles: [await font],
      defaultFontFamily: "TscircuitAlphabet",
    },
  })
    .render()
    .asPng()
}
