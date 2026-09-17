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
- Vector silkscreen/copper text, multiline alignment/mirroring, paths, circles,
  rectangles, fabrication notes, courtyards, and keepout outlines.
- Per-layer textures preserve layer opacity without darkening overlapping traces;
  erase passes preserve drill/cutout transparency. Four-sample MSAA is the default.

`compileCircuitJson` is a pure, DOM-free function that returns typed meshes and
unsupported-geometry diagnostics. `drawer.diagnostics` exposes the same results.
Consumers should use these diagnostics to fall back rather than silently omit
unsupported shapes. The pcb-viewer integration does this automatically.

This is an initial renderer, not full circuit-to-canvas feature parity. Curves are
camera-independent tessellations; extreme zoom can reveal facets. Knockout text,
interpolated/through-pad trace routes, and additional future PCB element variants
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

The browser suite executes real WebGPU shaders, compares 13 committed PNG
snapshots, checks cutout/pour-hole pixels independently, verifies that camera
changes do not upload geometry, and exercises resize/empty-scene/disposal. It
writes actual images, diffs, and a device/performance report to `tests/actual/`.
Use `WEBGPU_SOFTWARE=1` to request SwiftShader in CI; performance measurements from
software adapters should not be compared with hardware results.
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` can select an already-installed Chromium.

The AM3352 PCB fixture is derived from
[pcb-viewer at 2663068](https://github.com/tscircuit/pcb-viewer/blob/2663068/src/examples/2026/repros/am3352-dev-board/circuit.json),
retaining its PCB elements. New shape support should include geometry tests and a
small, inspectable fixture in `site/fixtures.ts` before updating snapshots.

Until the first registry release, the viewer pins a Git commit. This repository's
`prepare` script builds the package for Git dependencies (requires Bun).

For initial Git-pinned consumers, the built `dist/` is committed so installation needs no lifecycle scripts or development tools. Run `bun run build` and commit updated artifacts with renderer changes.
