# circuit-json-webgpu

A retained WebGPU PCB renderer for Circuit JSON. Geometry is triangulated and
uploaded once per circuit revision. Pan, zoom, layer visibility, and net highlights
update small GPU buffers; they do not regenerate Canvas 2D images or re-upload the
board. There is no `circuit-to-canvas` dependency.

```ts
import { CircuitToWebGpuDrawer } from "circuit-json-webgpu"

const drawer = await CircuitToWebGpuDrawer.create(canvas, {
  onDeviceLost: (message) => console.error(message),
})
drawer.setCircuitJson(circuitJson)
drawer.render({
  transform: { a: 10, b: 0, c: 0, d: -10, e: 400, f: 300 },
  selectedLayer: "top",
  hiddenLayerOpacity: 0.4,
  highlightedElementIds: ["pcb_trace_1"],
})
await drawer.flush() // optional; useful before snapshots
drawer.dispose()
```

`create` accepts either an HTMLCanvasElement or an OffscreenCanvas. For responsive
applications, transfer the canvas to a Worker and run this class there: compilation,
GPU uploads, and frame submission then stay off the UI thread. Camera coordinates
are physical canvas pixels; multiply the transform and canvas size by device pixel
ratio for HiDPI rendering. `drawElements(elements, options)` and
`realToCanvasMat` provide a circuit-to-canvas-style convenience API. Reuse the same
immutable elements array to retain buffers; provide a new array after an edit.

## Rendering

- Copper traces, circle/rectangle/rounded/pill/polygon pads and rotations.
- Plated holes, offset drills, slots, through and blind/buried vias.
- BRep copper pours with polygon holes and signed bulge arcs.
- Board/panel polygons, cutouts, soldermask openings.
- Vector silkscreen/copper text (including knockout), multiline alignment/mirroring, paths, circles,
  rectangles, fabrication notes, courtyards, and keepout outlines.
- Per-layer textures preserve layer opacity without darkening overlapping traces;
  erase passes preserve drill/cutout transparency. Four-sample MSAA is the default.

`compileCircuitJson` is a pure, DOM-free function that returns typed meshes and
unsupported-geometry diagnostics. `drawer.diagnostics` exposes the same results.
Consumers should use these diagnostics to fall back rather than silently omit
unsupported shapes. The pcb-viewer integration does this automatically.

This is an initial renderer, not full circuit-to-canvas feature parity. Curves are
camera-independent tessellations; extreme zoom can reveal facets. Interpolated/through-pad trace routes, and additional future PCB element variants
require further fixtures and implementations. Non-rendered metadata, solder paste,
and debug objects are intentionally ignored. Keepouts currently render outlines.
Device loss requires disposing/recreating the drawer or using a fallback. The
renderer never silently switches to Canvas 2D.

## Development and visual snapshots

```sh
bun install
bun run typecheck
bun test
bun run build
bunx playwright install chromium
bun run test:visual
bun run snapshots:update # inspect changes before committing new baselines
bun run dev              # fixture gallery
```

The browser suite executes real WebGPU shaders, compares 13 visual snapshot cases, checks cutout/pour-hole pixels independently, verifies that camera
changes do not upload geometry, and exercises resize/empty-scene/disposal. It
writes actual images, diffs, and a device/performance report to `tests/actual/`.
Use `xvfb-run -a env WEBGPU_SOFTWARE=1 bun run test:visual` on Linux to
request SwiftShader; performance measurements from
software adapters should not be compared with hardware results.
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` can select an already-installed Chromium.

The AM3352 PCB fixture is derived from
[pcb-viewer at 2663068](https://github.com/tscircuit/pcb-viewer/blob/2663068/src/examples/2026/repros/am3352-dev-board/circuit.json),
retaining its PCB elements. New shape support should include geometry tests and a
small, inspectable fixture in `site/fixtures.ts` before updating snapshots.

Until the first registry release, the viewer pins a Git commit.

For initial Git-pinned consumers, the built `dist/` is committed so installation needs no lifecycle scripts or development tools. Run `bun run build` and commit updated artifacts with renderer changes.


## Canvas parity audit

The full `circuit-to-canvas` test tree, including all fixtures and original
snapshots, is preserved byte-for-byte under `tests/upstream/circuit-to-canvas`.
It is pinned to commit `fa8405c67634e287b79a1506eedde077ef6accb0`; the manifest
and integrity test detect changes or omitted files. The reference implementation
is test-only and is not bundled into the renderer.

```sh
bun run test:reference # all 164 original tests in 116 files, original assertions
bun run test:parity    # executes all tests, then compares every captured draw
```

The audit captures 616 rendering calls, including direct shape/element calls,
and compares real WebGPU output against fresh Canvas output from the same data,
camera, background, and visibility options. Two tests (the SVG matcher example
and board ownership unit test) have no drawing operation and are explicitly
reported as reference-only. The native SVG debug render is additionally replayed
on a raster reference surface without altering its original SVG assertion.

The report contains reference/GPU/diff PNGs and a side-by-side HTML gallery in
`tests/actual/parity/index.html`. Raw pixel differences are retained. A Gaussian
filter with sigma 1 (radius 2), pixelmatch threshold 0.1, and an ink-relative
allowance distinguish analytic Canvas antialiasing from GPU MSAA. The allowance
is the ceiling of the smaller of 0.2% of image pixels and 2% of ink pixels, with
a four-pixel floor. Regression tests ensure the filter still rejects missing
labels/punctuation, compressed or shifted text, and incorrect colors. Original
snapshots are never updated by the audit.

**Full rendering parity is not achieved.** The recorded Metal run in
[`latest-report.json`](tests/parity/latest-report.json) passes all 26 text-only
render cases, but only 65 of 616 overall render comparisons pass. Remaining
failures cover soldermask/tenting, layer filtering and colors, trace clipping,
keepouts, annotations, and unsupported shapes. Ten original reference tests also
fail their frozen snapshots in this environment; those failures are recorded
separately from GPU parity failures. The separate Canvas parity audit CI check
intentionally fails while these mismatches remain and always uploads its report.
No tests or mismatches are skipped to make it green.

Text layout now follows the upstream glyph advances, kerning, actual ink bounds,
nine-point anchors, multiline alignment, mirroring, and knockout padding. Glyph
contours preserve disconnected parts and counters, and translucent glyphs are
filled without accumulating opacity at stroke joins. `DrawerOptions.textYAxis`
can be set to `"down"` for Canvas-style coordinates; the default `"up"` uses PCB
world coordinates. `layerColors` accepts per-layer RGBA overrides.
