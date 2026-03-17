import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";
import type { Plugin } from "vite";

// vite plugin to import .md files as raw text strings (matches tsup/esbuild text loader)
function mdRawPlugin(): Plugin {
  return {
    name: "md-raw",
    transform(code, id) {
      if (id.endsWith(".md")) {
        const content = readFileSync(id, "utf-8");
        return {
          code: `export default ${JSON.stringify(content)};`,
          map: null,
        };
      }
    },
  };
}

export default defineConfig({
  plugins: [mdRawPlugin()],
  test: {
    globals: true,
    root: ".",
    exclude: ["future/**", "node_modules/**"],
  },
});
