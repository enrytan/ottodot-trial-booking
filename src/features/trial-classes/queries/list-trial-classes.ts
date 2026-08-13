import "server-only";

import { createServerSupabaseClient } from "@/shared/database/supabase-server";

export type TrialClassAvailability = {
  id: number;
  name: string;
  startsAt: string;
  capacity: number;
  confirmedCount: number;
  availableSeats: number;
};

/**
 * Reads the availability view rather than counting here, so the seat count on
 * the booking page and the one on the roster cannot disagree.
 *
 * These numbers are advisory and already stale by the time the page renders.
 */
export async function listTrialClasses(): Promise<TrialClassAvailability[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("trial_class_availability")
    .select("id, name, starts_at, capacity, confirmed_count, available_seats")
    .order("starts_at", { ascending: true });

  if (error) {
    throw new Error("Failed to load trial classes", { cause: error });
  }

  // View columns carry no NOT NULL metadata, so generated types mark them
  // nullable. Normalising here keeps `| null` out of every component.
  return (data ?? []).map((row) => ({
    id: row.id!,
    name: row.name!,
    startsAt: row.starts_at!,
    capacity: row.capacity!,
    confirmedCount: row.confirmed_count ?? 0,
    availableSeats: row.available_seats ?? 0,
  }));
}
