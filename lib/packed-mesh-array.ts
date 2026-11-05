const CHUNK_LENGTH = 16_384

type MeshArray = Float32Array<ArrayBuffer> | Uint32Array<ArrayBuffer>

/** Grow in fixed-size chunks so appending never copies the previous geometry. */
export class PackedMeshArray<ArrayType extends MeshArray> {
  private chunks: ArrayType[] = []
  length = 0

  constructor(private readonly ArrayType: new (length: number) => ArrayType) {}

  push(...numbers: number[]) {
    for (const number of numbers) {
      const chunkOffset = this.length % CHUNK_LENGTH
      if (chunkOffset === 0) this.chunks.push(new this.ArrayType(CHUNK_LENGTH))
      this.chunks[this.chunks.length - 1][chunkOffset] = number
      this.length++
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
