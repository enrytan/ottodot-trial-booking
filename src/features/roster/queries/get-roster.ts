import "server-only";

import { BOOKING_STATUS } from "@/features/bookings/booking.types";
import { createServerSupabaseClient } from "@/shared/database/supabase-server";

export type Roster = {
  trialClass: {
    id: number;
    name: string;
    startsAt: string;
    capacity: number;
    confirmedCount: number;
  };
  students: {
    id: number;
    name: string;
    confirmedAt: string | null;
  }[];
};

/**
 * Used by both the roster page and the roster API route.
 *
 * Two queries on purpose: reading class metadata through the bookings join
 * returns nothing at all for a class with no confirmed students -- no name, no
 * capacity. The header comes from the availability view instead.
 */
export async function getRoster(classId: number): Promise<Roster | null> {
  const supabase = createServerSupabaseClient();

  const { data: trialClass, error: classError } = await supabase
    .from("trial_class_availability")
    .select("id, name, starts_at, capacity, confirmed_count")
    .eq("id", classId)
    .maybeSingle();

  if (classError) {
    throw new Error(`Failed to load class ${classId}`, { cause: classError });
  }

  if (!trialClass) return null;

  // Filtering here is what keeps pending, failed and cancelled bookings off the
  // roster -- absent by construction rather than by a display rule.
  const { data: rows, error: rowsError } = await supabase
    .from("bookings")
    .select("confirmed_at, student:students!inner ( id, name )")
    .eq("trial_class_id", classId)
    .eq("status", BOOKING_STATUS.CONFIRMED)
    .order("confirmed_at", { ascending: true });

  if (rowsError) {
    throw new Error(`Failed to load roster for class ${classId}`, {
      cause: rowsError,
    });
  }

  return {
    trialClass: {
      // View columns carry no NOT NULL metadata, so generated types mark them
      // nullable. The view groups by NOT NULL columns; they cannot be null.
      id: trialClass.id!,
      name: trialClass.name!,
      startsAt: trialClass.starts_at!,
      capacity: trialClass.capacity!,
      confirmedCount: trialClass.confirmed_count ?? 0,
    },
    students: (rows ?? []).map((row) => ({
      id: row.student.id,
      name: row.student.name,
      confirmedAt: row.confirmed_at,
    })),
  };
}
