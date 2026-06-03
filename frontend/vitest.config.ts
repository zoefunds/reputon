import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    globals: false,
    pool: "forks",
    server: {
      deps: {
        // server-only is a marker package that throws when imported in client
        // bundles; harmless in tests but we silence it.
        inline: ["server-only"],
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "server-only": resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
});
