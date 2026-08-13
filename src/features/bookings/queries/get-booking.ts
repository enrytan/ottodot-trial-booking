import "server-only";

import { createServerSupabaseClient } from "@/shared/database/supabase-server";

import type { BookingStatus, CancellationReason } from "../booking.types";

export type BookingDetail = {
  id: number;
  status: BookingStatus;
  cancellationReason: CancellationReason | null;
  confirmedAt: string | null;
  student: { id: number; name: string };
  trialClass: { id: number; name: string; startsAt: string };
};

export async function getBooking(
  bookingId: number,
): Promise<BookingDetail | null> {
  const supabase = createServerSupabaseClient();

  // `!inner` on both embeds: the foreign keys already guarantee a match, and
  // without it supabase-js types the embedded rows as possibly-null.
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      status,
      cancellation_reason,
      confirmed_at,
      student:students!inner ( id, name ),
      trial_class:trial_classes!inner ( id, name, starts_at )
      `,
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load booking ${bookingId}`, { cause: error });
  }

  if (!data) return null;

  // The boundary where `string` becomes the union, so it happens once rather
  // than in every component.
  return {
    id: data.id,
    status: data.status as BookingStatus,
    cancellationReason: data.cancellation_reason as CancellationReason | null,
    confirmedAt: data.confirmed_at,
    student: {
      id: data.student.id,
      name: data.student.name,
    },
    trialClass: {
      id: data.trial_class.id,
      name: data.trial_class.name,
      startsAt: data.trial_class.starts_at,
    },
  };
}
