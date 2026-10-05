import { expect, mock, test } from "bun:test"
import { requestWebGpuDevice } from "../lib/request-webgpu-device"

function createAdapter(maxStorageBuffersInVertexStage?: number) {
  const device = Object.create(null) as GPUDevice
  const requestDevice = mock<GPUAdapter["requestDevice"]>(() =>
    Promise.resolve(device),
  )
  const adapter = Object.assign(Object.create(null) as GPUAdapter, {
    limits: { maxStorageBuffersInVertexStage },
    requestDevice,
  })
  return { adapter, device, requestDevice }
}

test("uses the core adapter without a compatibility request or extra limits", async () => {
  const { adapter, device, requestDevice } = createAdapter()
  const requestAdapter = mock<GPU["requestAdapter"]>(() =>
    Promise.resolve(adapter),
  )
  expect(await requestWebGpuDevice({ requestAdapter })).toEqual({
    adapter,
    device,
  })
  expect(requestAdapter.mock.calls).toEqual([
    [{ powerPreference: "high-performance" }],
  ])
  expect(requestDevice.mock.calls).toEqual([[]])
})

test("requests compatibility and enables one vertex storage buffer when core is unavailable", async () => {
  const { adapter, device, requestDevice } = createAdapter(16)
  const requestAdapter = mock<GPU["requestAdapter"]>()
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(adapter)
  expect(await requestWebGpuDevice({ requestAdapter })).toEqual({
    adapter,
    device,
  })
  expect(requestAdapter.mock.calls).toEqual([
    [{ powerPreference: "high-performance" }],
    [{ powerPreference: "high-performance", featureLevel: "compatibility" }],
  ])
  expect(requestDevice.mock.calls).toEqual([
    [{ requiredLimits: { maxStorageBuffersInVertexStage: 1 } }],
  ])
})

test("reports unavailable WebGPU when neither adapter exists", async () => {
  const requestAdapter = mock(() => Promise.resolve(null))
  await expect(requestWebGpuDevice({ requestAdapter })).rejects.toThrow(
    "No WebGPU adapter available",
  )
  expect(requestAdapter).toHaveBeenCalledTimes(2)
})

for (const vertexStorageLimit of [0, undefined]) {
  test(`rejects an unsupported compatibility adapter with vertex storage limit ${vertexStorageLimit}`, async () => {
    const { adapter, requestDevice } = createAdapter(vertexStorageLimit)
    const requestAdapter = mock<GPU["requestAdapter"]>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(adapter)
    await expect(requestWebGpuDevice({ requestAdapter })).rejects.toThrow(
      "WebGPU compatibility adapter does not support vertex storage buffers",
    )
    expect(requestDevice).not.toHaveBeenCalled()
  })
}

test("preserves device request failures instead of masking them with another adapter", async () => {
  const { adapter, requestDevice } = createAdapter()
  requestDevice.mockRejectedValueOnce(new Error("Device request failed"))
  const requestAdapter = mock(() => Promise.resolve(adapter))
  await expect(requestWebGpuDevice({ requestAdapter })).rejects.toThrow(
    "Device request failed",
  )
  expect(requestAdapter).toHaveBeenCalledTimes(1)
})

test("preserves adapter request failures", async () => {
  const requestAdapter = mock<GPU["requestAdapter"]>().mockRejectedValueOnce(
    new Error("Adapter request failed"),
  )
  await expect(requestWebGpuDevice({ requestAdapter })).rejects.toThrow(
    "Adapter request failed",
  )
  expect(requestAdapter).toHaveBeenCalledTimes(1)
})
