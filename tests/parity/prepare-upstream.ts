import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const installed =
  process.env.PARITY_UPSTREAM_DIR ??
  dirname(require.resolve("circuit-to-canvas/package.json"))
const target = fileURLToPath(
  new URL("../upstream/circuit-to-canvas/", import.meta.url),
)
const manifest = JSON.parse(
  readFileSync(new URL("./upstream-manifest.json", import.meta.url), "utf8"),
)
// Use a disposable copy: upstream matchers write diffs beside their goldens.
// Recreate it so files removed by an upstream update cannot survive locally.
rmSync(target, { recursive: true, force: true })
// Copy every manifest entry so the installed dependency stays untouched.
for (const path of Object.keys(manifest.files)) {
  const dest = resolve(target, path)
  mkdirSync(dirname(dest), { recursive: true })
  cpSync(resolve(installed, path), dest)
}
