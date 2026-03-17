import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  jsx: "automatic",
  banner: {
    js: "#!/usr/bin/env node",
  },
  esbuildOptions(options) {
    options.loader = { ...options.loader, ".md": "text" };
  },
});
