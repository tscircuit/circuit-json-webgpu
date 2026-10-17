import type { ReferenceTest } from "./types"
import { spawnSync } from "node:child_process"
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  readdirSync,
} from "node:fs"
import { createHash } from "node:crypto"
import { fileURLToPath } from "node:url"
import { resolve, relative } from "node:path"
const root = fileURLToPath(new URL("../../", import.meta.url))
const upstream = resolve(root, "tests/upstream/circuit-to-canvas")
const actual = resolve(root, "tests/actual/parity")
mkdirSync(actual, { recursive: true })
// A failed preparation or capture must not reuse a previous audit's results.
for (const file of ["cases.json", "tests.json", "report.json"])
  rmSync(resolve(actual, file), { force: true })
await import("./prepare-upstream.ts")
const manifest = JSON.parse(
  readFileSync(resolve(root, "tests/parity/upstream-manifest.json"), "utf8"),
)
for (const [path, hash] of Object.entries(manifest.files)) {
  if (
    createHash("sha256")
      .update(readFileSync(resolve(upstream, path)))
      .digest("hex") !== hash
  )
    throw Error(`Upstream file changed: ${path}`)
}
// Always finish the GPU audit even when upstream's own frozen snapshots drift.
const reference = spawnSync(
  "bun",
  [
    "test",
    "--preload",
    "./tests/parity/capture.ts",
    "./tests/upstream/circuit-to-canvas/tests",
  ],
  { cwd: root, encoding: "utf8" },
)
writeFileSync(
  resolve(actual, "reference.log"),
  (reference.stdout ?? "") + (reference.stderr ?? ""),
)
console.log(
  `Reference test process exited ${reference.status}; see tests/actual/parity/reference.log`,
)
const tests: ReferenceTest[] = JSON.parse(
  readFileSync(resolve(actual, "tests.json"), "utf8"),
)
const expectedTestFiles = Object.keys(manifest.files).filter((path) =>
  path.endsWith(".test.ts"),
)
const executedTestFiles = new Set(tests.map((test) => test.path))
if (
  tests.length !== 207 ||
  executedTestFiles.size !== expectedTestFiles.length ||
  expectedTestFiles.some((path) => !executedTestFiles.has(path))
)
  throw Error("Incomplete upstream test execution")
const result = spawnSync("bun", ["tests/parity/run.ts"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
})
// The unchanged upstream matcher writes diff/missing files next to its goldens.
// Move those into the audit artifacts and keep the generated test workspace pristine.
// Stay inside tests: the sibling node_modules contains a schema dependency symlink.
for (const entry of readdirSync(resolve(upstream, "tests"), {
  recursive: true,
  withFileTypes: true,
})) {
  if (!entry.isFile()) continue
  const full = resolve(entry.parentPath, entry.name),
    path = relative(upstream, full)
  if (path === "manifest.json" || manifest.files[path]) continue
  const dest = resolve(actual, "upstream-generated", path)
  mkdirSync(resolve(dest, ".."), { recursive: true })
  writeFileSync(dest, readFileSync(full))
  rmSync(full)
}
process.exitCode =
  result.status || (process.env.SNAPSHOT_TEST_ONLY ? 0 : reference.status) || 0
