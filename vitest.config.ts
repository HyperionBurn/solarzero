import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    // The integration tests share a live Supabase test database, so file-level
    // parallelism causes cross-suite cleanup races and foreign-key failures.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      include: ["src/lib/**/*.ts", "src/server/**/*.ts"],
      exclude: ["src/test/**", "src/**/*.test.*", "src/**/*.d.ts"],
      thresholds: {
        functions: 10,
        lines: 10,
        branches: 5,
        statements: 10,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
