import {
  getPhaseSkewStrokes,
  type PhaseSkewLayer,
  type PhaseSkewStroke,
} from "./get-phase-skew-strokes"
import {
  PHASE_SKEW_STROKE_VERTEX_COUNT,
  phaseSkewStrokeShader,
} from "./phase-skew-stroke-shader"
import type { CircuitJson, RenderOptions } from "./types"

/** Overlay strokes are drawn 10% wider than the copper, as KiCad does (diff_phase_skew_tool.cpp), so the colour fully covers the trace edges. */
const OVERLAY_WIDTH_FACTOR = 1.1
const FLOAT_BYTES = Float32Array.BYTES_PER_ELEMENT
const FLOATS_PER_STROKE = 13
const START_COLOR_OFFSET = 4 * FLOAT_BYTES
const END_COLOR_OFFSET = 8 * FLOAT_BYTES
const WIDTH_OFFSET = 12 * FLOAT_BYTES

type LayerBuffer = { buffer: GPUBuffer; count: number }
type StrokePipelineOptions = {
  device: GPUDevice
  geometry: GPURenderPipelineDescriptor
}

/** Retains gradient strokes as an instance buffer for each copper layer. */
export class PhaseSkewLayerRenderer {
  private paletteKey?: string
  private strokePipeline?: GPURenderPipeline
  private layerBuffers = new Map<PhaseSkewLayer, LayerBuffer>()

  constructor(private readonly options: StrokePipelineOptions) {}

  /** Upload strokes when the circuit or palette changes. */
  update({
    circuitJson,
    colors,
  }: {
    circuitJson: CircuitJson
    colors: RenderOptions["phaseSkewColors"]
  }): void {
    const paletteKey = JSON.stringify([
      colors?.positive,
      colors?.negative,
      colors?.zero,
    ])
    if (paletteKey === this.paletteKey) return
    const byLayer = getPhaseSkewStrokes({ circuitJson, colors })
    this.clear()
    if (byLayer.size > 0)
      this.strokePipeline ??= createStrokePipeline(this.options)
    for (const [layer, strokes] of byLayer) {
      this.layerBuffers.set(
        layer,
        uploadStrokes({ device: this.options.device, strokes }),
      )
    }
    this.paletteKey = paletteKey
  }

  /** Draw before the copper layer's erase pass so drills cut through the overlay. */
  draw({
    pass,
    layer,
    cameraGroup,
  }: {
    pass: GPURenderPassEncoder
    layer: PhaseSkewLayer
    cameraGroup: GPUBindGroup
  }): void {
    const layerBuffer = this.layerBuffers.get(layer)
    if (!layerBuffer || !this.strokePipeline) return
    pass.setPipeline(this.strokePipeline)
    pass.setBindGroup(0, cameraGroup)
    pass.setVertexBuffer(0, layerBuffer.buffer)
    pass.draw(PHASE_SKEW_STROKE_VERTEX_COUNT, layerBuffer.count)
  }

  /** Discard the palette key and release the uploaded stroke buffers. */
  clear(): void {
    this.paletteKey = undefined
    for (const { buffer } of this.layerBuffers.values()) buffer.destroy()
    this.layerBuffers.clear()
  }
}

/** Pack one pair of endpoints, colors and a width per GPU instance. */
function uploadStrokes({
  device,
  strokes,
}: {
  device: GPUDevice
  strokes: PhaseSkewStroke[]
}): LayerBuffer {
  const attributes = new Float32Array(strokes.length * FLOATS_PER_STROKE)
  for (const [index, { segment, startColor, endColor }] of strokes.entries()) {
    attributes.set(
      [
        segment.start.x,
        segment.start.y,
        segment.end.x,
        segment.end.y,
        ...startColor,
        ...endColor,
        segment.width * OVERLAY_WIDTH_FACTOR,
      ],
      index * FLOATS_PER_STROKE,
    )
  }
  const buffer = device.createBuffer({
    size: attributes.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })
  device.queue.writeBuffer(buffer, 0, attributes)
  return { buffer, count: strokes.length }
}

/** Create the stroke pipeline for the same target and camera as copper. */
function createStrokePipeline({
  device,
  geometry,
}: StrokePipelineOptions): GPURenderPipeline {
  const module = device.createShaderModule({ code: phaseSkewStrokeShader })
  return device.createRenderPipeline({
    ...geometry,
    vertex: {
      ...geometry.vertex,
      module,
      buffers: [
        {
          arrayStride: FLOATS_PER_STROKE * FLOAT_BYTES,
          stepMode: "instance",
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x4" },
            {
              shaderLocation: 1,
              offset: START_COLOR_OFFSET,
              format: "float32x4",
            },
            {
              shaderLocation: 2,
              offset: END_COLOR_OFFSET,
              format: "float32x4",
            },
            { shaderLocation: 3, offset: WIDTH_OFFSET, format: "float32" },
          ],
        },
      ],
    },
    fragment: { ...geometry.fragment!, module },
  })
}
