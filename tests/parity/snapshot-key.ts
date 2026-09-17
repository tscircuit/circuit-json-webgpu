import { createHash } from "node:crypto"
/** Independent of test discovery order on different operating systems. */
export function snapshotKey(path: string, test: string, drawIndex: number) {
  const hash = createHash("sha256")
    .update(JSON.stringify([path, test, drawIndex]))
    .digest("hex")
    .slice(0, 12)
  const feature = path
    .split("/")
    .at(-1)!
    .replace(/\.test\.ts$/, "")
  return `${feature}-${hash}`
}
