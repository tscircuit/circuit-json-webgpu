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


## SVG / WebGPU comparison report

The complete original `circuit-to-canvas` test tree is preserved byte-for-byte
under `tests/upstream/circuit-to-canvas`, pinned to
`fa8405c67634e287b79a1506eedde077ef6accb0`. The manifest verifies every file.
Its original assertions run separately from the visual comparison.

```sh
bun run test:reference # 164 original tests in 116 files
bun run test:parity    # capture inputs, then render SVG and WebGPU independently
```

Each comparable case shows **circuit-to-svg on the left** and
**circuit-json-webgpu on the right**, in two fixed columns. Both use the same
Circuit JSON subset, explicit viewport, image dimensions, canonical PCB y-up
camera, layer selection, and black background. The left image is rasterized
from freshly generated SVG (linked from the image). The right is a fresh GPU
render. Neither side uses Canvas pixels, original snapshots, stacked comparison
PNGs, or prior rendering passes. Diffs are behind a separate disclosure.

Canvas-only primitive helpers, isolated soldermask/trace passes, separate clip
contexts, and mixed-side selections unsupported by the SVG API are explicitly
listed as **not comparable**, rather than assigned misleading images or counted
as passes. All original tests remain present and execute.

Open `tests/actual/parity/index.html` for the report, or inspect
[`latest-report.json`](tests/parity/latest-report.json). The old Canvas-reference
statistics do not describe this SVG comparison and have been superseded.
Full renderer parity is still incomplete; CI fails on comparison errors and
mismatches and uploads all artifacts. Native Canvas assertion failures are
reported separately.

Raw pixel differences are retained alongside an antialiasing-aware metric
(Gaussian sigma 1, radius 2; pixelmatch threshold 0.1). The allowance is the
ceiling of the smaller of 0.2% of image pixels and 2% of ink pixels, with a
four-pixel floor. Regression tests reject missing punctuation, shifted/compressed
text, and incorrect colors. No original snapshots are updated by the audit.

Text layout follows upstream glyph advances, kerning, actual ink bounds,
nine-point anchors, multiline alignment, mirroring, and knockout padding.
Disconnected glyph contours and counters are preserved; translucent glyphs are
filled without accumulating opacity at stroke joins. `DrawerOptions.textYAxis`
accepts `"down"` for Canvas coordinates (default `"up"` for PCB coordinates),
and `layerColors` accepts per-layer RGBA overrides.
