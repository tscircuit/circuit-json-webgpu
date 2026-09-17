import { createCanvas, loadImage } from "@napi-rs/canvas"
import { Resvg, type ResvgRenderOptions } from "@resvg/resvg-js"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import tscircuitFont from "@tscircuit/alphabet/base64font"

// Pre-generated label PNGs for common labels
const labelPngCache: Map<string, Buffer> = new Map()
const assetsDir = path.join(__dirname, "assets")

const getPreGeneratedLabelPng = (label: string): Buffer => {
  const cacheKey = label
  if (labelPngCache.has(cacheKey)) {
    return labelPngCache.get(cacheKey)!
  }

  const filename = `label-${label}.png`
  const filepath = path.join(assetsDir, filename)
  if (fs.existsSync(filepath)) {
    const png = fs.readFileSync(filepath)
    labelPngCache.set(cacheKey, png)
    return png
  }
  throw new Error(`Label PNG not found for label: ${label}`)
}

export const stackPngsVertically = async (
  pngs: Array<{ png: Buffer; label: string }>,
): Promise<Buffer> => {
  if (pngs.length === 0) {
    throw new Error("No PNGs provided to stack")
  }

  if (pngs.length === 1) {
    return pngs[0]!.png
  }

  // Load all images to get dimensions
  const images = await Promise.all(
    pngs.map(async ({ png }) => await loadImage(png)),
  )

  // Calculate the maximum width and total height
  const maxWidth = Math.max(...images.map((img) => img.width))
  const totalHeight = images.reduce((sum, img) => sum + img.height, 0)

  // Create the final canvas
  const canvas = createCanvas(maxWidth, totalHeight)
  const ctx = canvas.getContext("2d")

  // Fill with dark background
  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, maxWidth, totalHeight)

  // Draw each image and its label
  let currentY = 0
  for (let i = 0; i < pngs.length; i++) {
    const { label } = pngs[i]!
    const img = images[i]!
    const width = img.width
    const height = img.height

    // Center horizontally if image is narrower than max width
    const left = Math.floor((maxWidth - width) / 2)

    // Draw the image
    ctx.drawImage(img, left, currentY)

    // Draw the label
    const labelPng = getPreGeneratedLabelPng(label)
    const labelImg = await loadImage(labelPng!)
    ctx.drawImage(labelImg, 0, currentY)

    currentY += height
  }

  return canvas.toBuffer("image/png")
}

export const svgToPng = (svgString: string): Buffer => {
  const fontBuffer = Buffer.from(tscircuitFont, "base64")

  let tempFontPath: string | undefined
  let cleanupFn: (() => void) | undefined

  try {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "resvg-font-"))
    tempFontPath = path.join(tempDir, "tscircuit-font.ttf")
    fs.writeFileSync(tempFontPath, fontBuffer)

    cleanupFn = () => {
      try {
        fs.unlinkSync(tempFontPath!)
      } catch {
        // Ignore errors during cleanup
      }
    }

    const opts: ResvgRenderOptions = {
      font: {
        fontFiles: [tempFontPath],
        loadSystemFonts: false,
        defaultFontFamily: "TscircuitAlphabet",
        monospaceFamily: "TscircuitAlphabet",
        sansSerifFamily: "TscircuitAlphabet",
      },
    }

    const resvg = new Resvg(svgString, opts)
    const pngData = resvg.render()
    const pngBuffer = pngData.asPng()

    return Buffer.from(pngBuffer)
  } finally {
    // Clean up temporary font file
    if (cleanupFn) {
      cleanupFn()
    }
  }
}
