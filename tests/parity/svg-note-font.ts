import { readFile, readdir } from "node:fs/promises"
import { join } from "node:path"
import { Resvg } from "@resvg/resvg-js"
import { parse } from "opentype.js"

// Identify the font actually used for Arial/sans-serif, including a missing-font
// fallback. Compare resolved outlines; never alter the SVG or its font settings.
const probe = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000"><text x="500" y="500" font-family="Arial, sans-serif" font-size="100" text-anchor="middle" dominant-baseline="central">AgWi0129 AV</text></svg>`

export async function getSvgNoteFont(): Promise<Buffer> {
  const reference = new Resvg(probe).toString()
  const directories =
    process.platform === "darwin"
      ? ["/System/Library/Fonts", "/Library/Fonts"]
      : process.platform === "win32"
        ? [join(process.env.WINDIR ?? "C:\\Windows", "Fonts")]
        : ["/usr/share/fonts", "/usr/local/share/fonts"]
  const files: string[] = []
  for (const directory of directories) {
    const entries = await readdir(directory, {
      recursive: true,
      withFileTypes: true,
    }).catch(() => [])
    files.push(
      ...entries
        .filter((entry) => entry.isFile() && /\.(ttf|otf)$/i.test(entry.name))
        .map((entry) => join(entry.parentPath, entry.name)),
    )
  }
  // Common Arial installations and Linux's default fallback are tried first.
  files.sort(
    (a, b) =>
      Number(!/[/\\](Arial\.ttf|arial\.ttf|Inconsolata\.otf)$/.test(a)) -
      Number(!/[/\\](Arial\.ttf|arial\.ttf|Inconsolata\.otf)$/.test(b)),
  )
  for (const file of files) {
    try {
      const data = await readFile(file)
      const font = parse(Uint8Array.from(data).buffer)
      const resolved = new Resvg(probe, {
        font: {
          fontFiles: [file],
          loadSystemFonts: false,
          defaultFontFamily: font.names.fontFamily.en,
        },
      }).toString()
      if (resolved === reference) {
        console.log(`PCB note SVG font: ${font.names.fullName.en} (${file})`)
        return data
      }
    } catch {
      // Some system font formats are unsupported by the outline reader.
    }
  }
  throw new Error(
    "Could not resolve the SVG PCB note font to a supported system TTF/OTF file",
  )
}
