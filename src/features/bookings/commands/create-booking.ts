import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/shared/database/database.types";
import { createServerSupabaseClient } from "@/shared/database/supabase-server";

import { BOOKING_STATUS, type CreateBookingResult } from "../booking.types";

/** Raised by one_active_booking_per_student_class. */
const UNIQUE_VIOLATION = "23505";

type Client = SupabaseClient<Database>;

export type CreateBookingInput = {
  parentId: number;
  studentId: number;
  classId: number;
};

/**
 * Creates a pending booking, which reserves no seat -- that is what lets two
 * parents both reach payment for the same last seat. confirm_booking() claims
 * the seat later, under a lock.
 */
export async function createBooking(
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  const supabase = createServerSupabaseClient();

  // The foreign key guarantees the student has SOME parent; it cannot check
  // the submitted pair.
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, parent_id")
    .eq("id", input.studentId)
    .maybeSingle();

  if (studentError) {
    throw new Error("Failed to load student", { cause: studentError });
  }

  if (!student) return { status: "not_found" };
  if (student.parent_id !== input.parentId) return { status: "invalid_selection" };

  // Checked before availability on purpose: a parent who already has a booking
  // should be sent to it rather than told the class is full.
  const existing = await findActiveBooking(supabase, input.studentId, input.classId);
  if (existing !== null) return { status: "duplicate", bookingId: existing };

  // Advisory only, and allowed to be stale.
  const { data: availability, error: availabilityError } = await supabase
    .from("trial_class_availability")
    .select("id, available_seats")
    .eq("id", input.classId)
    .maybeSingle();

  if (availabilityError) {
    throw new Error("Failed to load class availability", { cause: availabilityError });
  }

  if (!availability) return { status: "not_found" };
  if ((availability.available_seats ?? 0) <= 0) return { status: "class_full" };

  const { data: created, error: insertError } = await supabase
    .from("bookings")
    .insert({
      student_id: input.studentId,
      trial_class_id: input.classId,
      status: BOOKING_STATUS.PENDING_PAYMENT,
    })
    .select("id")
    .single();

  if (insertError) {
    // Two requests passed the duplicate check together and this one lost the
    // insert. The winner's booking now exists, so send this parent there --
    // same outcome as if the check had caught it.
    if (insertError.code === UNIQUE_VIOLATION) {
      const raced = await findActiveBooking(supabase, input.studentId, input.classId);
      if (raced !== null) return { status: "duplicate", bookingId: raced };
    }

    throw new Error("Failed to create booking", { cause: insertError });
  }

  return { status: "created", bookingId: created.id };
}

/** "Active" means occupying the slot in the partial unique index. */
async function findActiveBooking(
  supabase: Client,
  studentId: number,
  classId: number,
): Promise<number | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select("id")
    .eq("student_id", studentId)
    .eq("trial_class_id", classId)
    .in("status", [BOOKING_STATUS.PENDING_PAYMENT, BOOKING_STATUS.CONFIRMED])
    .maybeSingle();

  if (error) {
    throw new Error("Failed to look up existing booking", { cause: error });
  }

  return data?.id ?? null;
}
