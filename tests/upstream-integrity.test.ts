import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { resolve } from "node:path"
import manifest from "./upstream/circuit-to-canvas/manifest.json"
test("every upstream test, fixture, snapshot, and reference source is preserved byte-for-byte", () => {
  expect(
    Object.keys(manifest.files).filter((p) => p.endsWith(".test.ts")),
  ).toHaveLength(116)
  for (const [path, hash] of Object.entries(manifest.files))
    expect(
      createHash("sha256")
        .update(
          readFileSync(
            resolve(import.meta.dir, "upstream/circuit-to-canvas", path),
          ),
        )
        .digest("hex"),
      path,
    ).toBe(hash)
})
