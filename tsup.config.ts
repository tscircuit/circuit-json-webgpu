import { defineConfig } from "tsup"

export default defineConfig({
  noExternal: [/^circuit-to-canvas(?:\/|$)/],
})
