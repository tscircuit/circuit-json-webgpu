Text layout helpers are imported from the installed MIT-licensed
`circuit-to-canvas` dependency, pinned in package.json and bun.lock. Only the
used text helpers are bundled into the renderer; the Canvas renderer is used
by the test harness. The upstream license is included in the installed package.

The parity harness prepares an ignored workspace from that package to run all
original tests without modifying node_modules. Its checked-in hash manifest
verifies the pinned source, fixtures, and snapshots.
