// Keep the chunk length divisible by the vertex stride.
const CHUNK_LENGTH = 16_384

type MeshArray = Float32Array<ArrayBuffer> | Uint32Array<ArrayBuffer>

type MeshChunkSpan<ArrayType extends MeshArray> = {
  chunk: ArrayType
  chunkOffset: number
  sourceOffset: number
  length: number
}

/** Grow in fixed-size chunks so appending never copies the previous geometry. */
export class PackedMeshArray<ArrayType extends MeshArray> {
  private chunks: ArrayType[] = []
  length = 0

  constructor(private readonly ArrayType: new (length: number) => ArrayType) {}

  append(length: number, write: (span: MeshChunkSpan<ArrayType>) => void) {
    let sourceOffset = 0
    while (sourceOffset < length) {
      const chunkOffset = this.length % CHUNK_LENGTH
      if (chunkOffset === 0) this.chunks.push(new this.ArrayType(CHUNK_LENGTH))
      const spanLength = Math.min(
        length - sourceOffset,
        CHUNK_LENGTH - chunkOffset,
      )
      write({
        chunk: this.chunks[this.chunks.length - 1],
        chunkOffset,
        sourceOffset,
        length: spanLength,
      })
      this.length += spanLength
      sourceOffset += spanLength
    }
  }

  toTypedArray(): ArrayType {
    const packed = new this.ArrayType(this.length)
    for (const [index, chunk] of this.chunks.entries()) {
      const offset = index * CHUNK_LENGTH
      packed.set(chunk.subarray(0, this.length - offset), offset)
    }
    return packed
  }
}
