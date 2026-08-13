import "server-only";

import { cookies } from "next/headers";

/**
 * Stands in for an authenticated session.
 *
 * Not a security boundary -- anyone can set this cookie to any parent id. It is
 * isolated here so swapping it for a real session touches one file.
 */
const COOKIE_NAME = "demo_parent_id";

export async function getSelectedParentId(): Promise<number | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;

  if (!raw) return null;

  const parsed = Number.parseInt(raw, 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Falls back to the first parent, because cookies can only be written from an
 * action and a first-time visitor has none. Both the page and
 * createBookingAction call this, so what is shown and what is booked agree.
 */
export async function resolveDemoParentId(): Promise<number | null> {
  const fromCookie = await getSelectedParentId();
  if (fromCookie !== null) return fromCookie;

  const { createServerSupabaseClient } = await import("./database/supabase-server");
  const supabase = createServerSupabaseClient();

  const { data } = await supabase
    .from("parents")
    .select("id")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

export async function setSelectedParentId(parentId: number): Promise<void> {
  const store = await cookies();

  store.set(COOKIE_NAME, String(parentId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}
