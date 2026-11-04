import path from "node:path";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
      // `server-only` throws outside a React Server Components build; tests run server code directly.
      "server-only": path.resolve(root, "tests/unit/server-only-stub.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
    environment: "node",
    setupFiles: ["tests/unit/test-env.ts"],
  },
});
