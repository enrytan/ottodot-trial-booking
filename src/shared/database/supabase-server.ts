import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill it in from ` +
        "`npx supabase status`.",
    );
  }

  return value;
}

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseSecretKey = requireEnv("SUPABASE_SECRET_KEY");

/**
 * The secret key bypasses RLS, so the `server-only` import above is what keeps
 * this module out of the client bundle.
 */
export function createServerSupabaseClient() {
  return createClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
