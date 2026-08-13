import { existsSync } from "node:fs";
import path from "node:path";

import { defineConfig } from "vitest/config";

// Vitest does not read .env.local the way `next dev` does, so the Supabase
// client's requireEnv() would throw before a single test ran.
//
// process.loadEnvFile is built into Node -- no dotenv, no importing vite's
// loadEnv from a transitive dependency. Guarded because it throws on a missing
// file, and CI would supply these variables directly.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

export default defineConfig({
  test: {
    environment: "node",

    // Refuses to run against anything but a local database. See the file for
    // why this exists. Its teardown also removes fixture rows.
    globalSetup: ["./tests/helpers/guard-local-db.ts"],

    // Test files share one database. Fixtures are isolated, so parallelism
    // would be safe -- but the last-seat test measures real concurrency, and
    // running other suites alongside it only adds noise to the thing being
    // measured.
    fileParallelism: false,

    // The race test runs 20 iterations, each creating a fixture and firing two
    // concurrent RPCs.
    testTimeout: 30_000,
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),

      // `server-only` resolves to a module that throws unless the bundler
      // supplies React's "react-server" condition. Vitest doesn't, so importing
      // any command would fail immediately. Aliasing it to an empty module is
      // the standard workaround -- the real protection is at build time, where
      // Next.js still enforces it.
      "server-only": path.resolve(__dirname, "tests/helpers/server-only-stub.ts"),
    },
  },
});
