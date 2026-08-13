import { cleanupFixtures } from "./db";

/**
 * These tests insert, confirm and delete real rows. If .env.local ever pointed
 * at a hosted project, `npm test` would quietly rewrite the deployed demo.
 *
 * In globalSetup rather than a per-file beforeAll so a new test file cannot
 * forget to opt in.
 */
export default async function setup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not set. Copy .env.example to .env.local " +
        "and fill it in from `npx supabase status`.",
    );
  }

  const isLocal = url.includes("127.0.0.1") || url.includes("localhost");

  if (!isLocal) {
    throw new Error(
      `Refusing to run integration tests against ${url}. These tests write to ` +
        "the database and are only safe against a local Supabase instance.",
    );
  }

  // Runs after every file, so one suite's cleanup cannot delete another's data
  // mid-run.
  return async () => {
    await cleanupFixtures();
  };
}
