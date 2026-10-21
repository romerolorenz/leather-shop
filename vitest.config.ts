import { defineConfig, type TestProjectInlineConfiguration } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { config } from "dotenv";

config({ path: ".env.local" });

// Tests run against the real (dev) Supabase project, with no isolated
// per-test database. Files that change the same shared rows can't run at
// the same time, or one file's before/after snapshot gets clobbered by
// another's (e.g. stock counts, or a settings value read mid-change). So
// files are split into lanes by the shared data they touch, so no two
// files that change the same rows ever overlap. Each lane runs its files
// one at a time. `npm test` (tests/run-lanes.mjs) runs the lanes side by
// side as separate processes, which cuts the run time (it's almost all
// ~0.3s round trips to dev). Plain `npx vitest run` still works, but runs
// the lanes one after the other.
//
// Where a new test file goes:
// - touches orders/stock, or a setting order code reads → data. That's
//   the default: anything not listed below (products, stock, orders, the
//   expiry sweep, promo codes, categories, pure unit tests) lands there;
// - otherwise, changes `settings` rows or which products are featured:
//   SETTINGS_LANE;
// - touches only FAQ items, payment methods, saved addresses, or reads
//   reference data (and never products, stock, orders, promo codes or
//   settings): CONTENT_LANE.

// Homepage settings and featured products only: no order code reads them.
// settings.test.ts (order_payment_hold_hours) and api-orders-expire.test.ts
// (the real expiry sweep, which cancels expired dev orders and restores
// their stock) stay in "data", next to orders.test.ts.
const SETTINGS_LANE = [
  "tests/admin-homepage-settings.test.ts",
  "tests/admin-homepage-studio.test.ts",
  "tests/admin-homepage-hero-upload.test.ts",
  "tests/admin-homepage-featured.test.ts",
];

const CONTENT_LANE = [
  "tests/admin-faq.test.ts",
  // Both change payment_methods, so they stay in the same lane.
  "tests/payment-methods.test.ts",
  "tests/admin-image-uploads.test.ts",
  "tests/customer-addresses.test.ts",
  "tests/psgc.test.ts", // read-only
  "tests/db-function-permissions.test.ts", // read-only (anon key)
];

const shared = {
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    // Refuses to run unless the target is the dev database (see
    // tests/setup/test-target.mjs). Runs once per process, before any file.
    globalSetup: ["tests/setup/test-target-guard.ts"],
    setupFiles: ["tests/setup/no-email.ts", "tests/setup/request-timeout.ts"],
    fileParallelism: false,
    // Per test. Most finish in under 10s; the request timeout above means
    // a hang fails well inside this.
    testTimeout: 20_000,
    // Cleanup hooks delete everything a file created, one row per request,
    // so give them room. Cutting cleanup short would leave data on dev.
    hookTimeout: 30_000,
  },
} satisfies TestProjectInlineConfiguration;

export default defineConfig({
  test: {
    teardownTimeout: 10_000,
    projects: [
      {
        ...shared,
        test: { ...shared.test, name: "settings", include: SETTINGS_LANE },
      },
      {
        ...shared,
        test: { ...shared.test, name: "content", include: CONTENT_LANE },
      },
      {
        ...shared,
        test: {
          ...shared.test,
          name: "data",
          include: ["tests/**/*.test.ts"],
          exclude: [...SETTINGS_LANE, ...CONTENT_LANE],
        },
      },
    ],
  },
});
