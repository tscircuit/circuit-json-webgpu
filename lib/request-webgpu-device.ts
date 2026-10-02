/** Prefer Core WebGPU, then try an OpenGLES/D3D11 compatibility adapter. */
export async function requestWebGpuDevice(gpu: Pick<GPU, "requestAdapter">) {
  const coreAdapter = await gpu.requestAdapter({
    powerPreference: "high-performance",
  })
  if (coreAdapter) {
    return { adapter: coreAdapter, device: await coreAdapter.requestDevice() }
  }

  const compatibilityAdapter = await gpu.requestAdapter({
    powerPreference: "high-performance",
    featureLevel: "compatibility",
  })
  if (!compatibilityAdapter) throw new Error("No WebGPU adapter available")

  // Compatibility devices default to zero vertex storage buffers, even when
  // the adapter supports more. The highlight/X-Ray shader needs one.
  if ((compatibilityAdapter.limits.maxStorageBuffersInVertexStage ?? 0) < 1) {
    throw new Error(
      "WebGPU compatibility adapter does not support vertex storage buffers required for PCB rendering",
    )
  }
  const device = await compatibilityAdapter.requestDevice({
    requiredLimits: { maxStorageBuffersInVertexStage: 1 },
  })
  return { adapter: compatibilityAdapter, device }
}
