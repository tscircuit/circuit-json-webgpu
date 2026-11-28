import {
  getPhaseSkewStrokes,
  type PhaseSkewLayer,
  type PhaseSkewStroke,
} from "./get-phase-skew-strokes"
import {
  PHASE_SKEW_STROKE_VERTEX_COUNT,
  phaseSkewStrokeShader,
} from "./phase-skew-stroke-shader"

/** Overlay strokes are drawn 10% wider than the copper, as KiCad does (diff_phase_skew_tool.cpp), so the colour fully covers the trace edges. */
const OVERLAY_WIDTH_FACTOR = 1.1
const FLOAT_BYTES = Float32Array.BYTES_PER_ELEMENT
const FLOATS_PER_STROKE = 16
const START_COLOR_OFFSET = 4 * FLOAT_BYTES
const END_COLOR_OFFSET = 8 * FLOAT_BYTES
const WIDTH_OFFSET = 12 * FLOAT_BYTES
const CAPS_OFFSET = 13 * FLOAT_BYTES
const BODY_COLOR_ENDPOINT_OFFSET = 15 * FLOAT_BYTES
const BODY_COLOR_ENDPOINT = { start: -1, end: 1 }

type LayerBuffer = { buffer: GPUBuffer; count: number }
type StrokePipelineOptions = {
  device: GPUDevice
  geometry: GPURenderPipelineDescriptor
  camera: GPUBuffer
}
type StrokePipeline = { pipeline: GPURenderPipeline; cameraGroup: GPUBindGroup }

/** Retains gradient strokes as an instance buffer for each copper layer. */
export class PhaseSkewLayerRenderer {
  private paletteKey?: string
  private strokePipeline?: StrokePipeline
  private layerBuffers = new Map<PhaseSkewLayer, LayerBuffer>()

  constructor(private readonly options: StrokePipelineOptions) {}

  /** Upload strokes when the circuit or palette changes. */
  update({
    elements,
    colors,
  }: Parameters<typeof getPhaseSkewStrokes>[0]): void {
    const paletteKey = JSON.stringify([
      colors?.positive,
      colors?.negative,
      colors?.zero,
    ])
    if (paletteKey === this.paletteKey) return
    const byLayer = getPhaseSkewStrokes({ elements, colors })
    this.clear()
    if (byLayer.size > 0)
      this.strokePipeline ??= createStrokePipeline(this.options)
    for (const [layer, { joints, segments }] of byLayer) {
      this.layerBuffers.set(
        layer,
        uploadStrokes({
          device: this.options.device,
          strokes: joints.concat(segments),
        }),
      )
    }
    this.paletteKey = paletteKey
  }

  /** Draw before the copper layer's erase pass so drills cut through the overlay. */
  draw({
    pass,
    layer,
  }: {
    pass: GPURenderPassEncoder
    layer: PhaseSkewLayer
  }): void {
    const layerBuffer = this.layerBuffers.get(layer)
    if (!layerBuffer || !this.strokePipeline) return
    pass.setPipeline(this.strokePipeline.pipeline)
    pass.setBindGroup(0, this.strokePipeline.cameraGroup)
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
  for (const [index, stroke] of strokes.entries()) {
    const {
      segment,
      startColor,
      endColor,
      bodyColorEndpoint,
      roundStart,
      roundEnd,
    } = stroke
    attributes.set(
      [
        segment.start.x,
        segment.start.y,
        segment.end.x,
        segment.end.y,
        ...startColor,
        ...endColor,
        segment.width * OVERLAY_WIDTH_FACTOR,
        Number(roundStart),
        Number(roundEnd),
        bodyColorEndpoint ? BODY_COLOR_ENDPOINT[bodyColorEndpoint] : 0,
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
  camera,
}: StrokePipelineOptions): StrokePipeline {
  const module = device.createShaderModule({ code: phaseSkewStrokeShader })
  const pipeline = device.createRenderPipeline({
    ...geometry,
    layout: "auto",
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
            { shaderLocation: 4, offset: CAPS_OFFSET, format: "float32x2" },
            {
              shaderLocation: 5,
              offset: BODY_COLOR_ENDPOINT_OFFSET,
              format: "float32",
            },
          ],
        },
      ],
    },
    fragment: { ...geometry.fragment!, module },
  })
  const cameraGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: camera } }],
  })
  return { pipeline, cameraGroup }
}
