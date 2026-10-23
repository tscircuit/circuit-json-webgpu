import { defineConfig } from "tsup"

export default defineConfig({
  dts: {
    banner: '/// <reference types="@webgpu/types" />',
  },
  noExternal: [/^circuit-to-canvas(?:\/|$)/],
})
