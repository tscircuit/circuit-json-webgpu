# SVG route-via reference correction

Version 0.0.451 ignores `hole_diameter` and `outer_diameter` on trace route
vias, and suppresses them whenever a standalone via occupies the same position,
even on different copper layers or boards. The patch corrects those two behaviors;
it retains the reference's existing dimension fallbacks and rendering code.

`tests/svg-route-vias.test.ts` verifies the reference directly, independently of
the WebGPU compiler. Both the base and proposed CI audits install this same patch.
No comparisons, pixel tolerances, diagnostics, or regression checks are disabled.
Remove the patch when a pinned SVG release includes equivalent fixes.
