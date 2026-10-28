import { createHash } from "node:crypto"
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { Resvg } from "@resvg/resvg-js"

/** Resvg does not load CSS @font-face URLs; use the SVG's own bundled font. */
export function renderReferenceSvg(svg: string) {
  const font = svg.match(/data:font\/ttf;base64,([^'"\s)]+)/)?.[1]
  if (!font) throw new Error("SVG reference is missing its embedded font")
  const hash = createHash("sha256").update(font).digest("hex")
  const directory = new URL("../actual/parity/fonts/", import.meta.url)
  const path = fileURLToPath(new URL(`${hash}.ttf`, directory))
  if (!existsSync(path)) {
    mkdirSync(directory, { recursive: true })
    writeFileSync(path, Buffer.from(font, "base64"))
  }
  return new Resvg(svg, {
    font: {
      loadSystemFonts: false,
      fontFiles: [path],
      defaultFontFamily: "TscircuitAlphabet",
    },
  })
    .render()
    .asPng()
}
