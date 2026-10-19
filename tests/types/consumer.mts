import { CircuitToWebGpuDrawer } from "@tscircuit/circuit-json-webgpu"

export async function getAdapterVendor(canvas: HTMLCanvasElement) {
  const drawer = await CircuitToWebGpuDrawer.create(canvas)
  const info: GPUAdapterInfo | undefined = drawer.adapterInfo
  return info?.vendor
}
