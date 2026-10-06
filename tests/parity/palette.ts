// Compare geometry using the pinned SVG reference palette. Renderer defaults
// are checked separately by tests/visual.ts (including yellow bottom silkscreen).
export const comparisonSilkscreenColors = {
  top: "#f2eda1",
  bottom: "#5da9e9",
}

// SVG distinguishes two covered-copper shades; Canvas/WebGPU use one. Match
// the palette explicitly while continuing to compare all copper/mask geometry.
export const comparisonCoveredCopperColors = {
  top: "rgb(52, 135, 73)",
  bottom: "rgb(52, 135, 73)",
}
