import type { AnyCircuitElement } from "circuit-json"
export type CircuitJson = readonly AnyCircuitElement[]
export type Point = { x: number; y: number }
export type Matrix = {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}
export type Color = readonly [number, number, number, number]
export type RenderOptions = {
  transform?: Matrix
  layers?: readonly string[]
  selectedLayer?: string
  hiddenLayerOpacity?: number
  showCopperPours?: boolean
  showSolderMask?: boolean
  showSilkscreen?: boolean
  showFabricationNotes?: boolean
  showPcbNotes?: boolean
  showCourtyards?: boolean
  highlightedElementIds?: readonly string[]
  background?: Color
}
export type Diagnostic = { elementId: string; type: string; message: string }
export type Mesh = { vertices: Float32Array; indices: Uint32Array }
export type CompiledLayer = { name: string; paint: Mesh; erase: Mesh }
export type CompiledScene = {
  layers: CompiledLayer[]
  elementIds: string[]
  diagnostics: Diagnostic[]
  triangleCount: number
}
export type DrawerOptions = {
  sampleCount?: 1 | 4
  onDeviceLost?: (message: string) => void
}
