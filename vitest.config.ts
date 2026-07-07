import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { config } from "dotenv";

config({ path: ".env.local" });

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
    // Tests run against the real (dev) Supabase project — no isolated
    // per-test database. Several test files mutate the same shared
    // product/stock rows, so file-level parallelism causes real races
    // (one test's before/after stock snapshot gets clobbered by another
    // file's concurrent order). Run files sequentially instead.
    fileParallelism: false,
  },
});
