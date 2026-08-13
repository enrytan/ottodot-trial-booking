import { BOOKING_STATUS } from "@/features/bookings/booking.types";
import { createServerSupabaseClient } from "@/shared/database/supabase-server";

/**
 * Every fixture row carries this marker so cleanup can find it without a
 * registry. That also means a crashed run self-heals: the next run's teardown
 * sweeps up whatever the last one left behind.
 *
 * Tests build their own data rather than reusing seed.sql. Sharing seeded rows
 * would couple tests to each other and to the demo -- one test confirming a
 * booking would change the state another depends on, and `npm test` would
 * quietly destroy the scenarios the README points at.
 */
export const FIXTURE_PREFIX = "__test__";

let sequence = 0;
const uniqueSuffix = () => `${Date.now()}-${sequence++}`;

/**
 * Flattens a PostgREST error into the message.
 *
 * `new Error(msg, { cause })` is tidy but Vitest does not print the cause, so a
 * failure reads "fixture: class" and tells you nothing. The code and hint are
 * the useful parts -- 42501 and "GRANT SELECT ... TO service_role" name the
 * problem outright.
 */
function fixtureError(
  step: string,
  error: { message: string; code?: string; details?: string | null; hint?: string | null },
): Error {
  const parts = [error.message];
  if (error.code) parts.push(`code ${error.code}`);
  if (error.details) parts.push(`details: ${error.details}`);
  if (error.hint) parts.push(`hint: ${error.hint}`);

  return new Error(`fixture ${step} -- ${parts.join(" | ")}`);
}

export type LastSeatFixture = {
  classId: number;
  /** Two pending bookings, different families, competing for one seat. */
  bookingAId: number;
  bookingBId: number;
};

/**
 * A class filled to one seat short of capacity, plus two pending bookings.
 *
 * Confirmed bookings are inserted directly rather than through
 * confirm_booking() -- this is arranging a starting state, not exercising the
 * code under test. They must set confirmed_at, or confirmed_iff_timestamp
 * rejects them.
 */
export async function createLastSeatFixture(
  options: { capacity?: number; confirmedCount?: number } = {},
): Promise<LastSeatFixture> {
  const supabase = createServerSupabaseClient();

  const capacity = options.capacity ?? 4;
  const confirmedCount = options.confirmedCount ?? capacity - 1;
  const suffix = uniqueSuffix();

  const { data: trialClass, error: classError } = await supabase
    .from("trial_classes")
    .insert({
      name: `${FIXTURE_PREFIX} Class ${suffix}`,
      starts_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      capacity,
    })
    .select("id")
    .single();

  if (classError) throw fixtureError("class", classError);

  // One family per student, so the two racers are genuinely different parents.
  const familyCount = confirmedCount + 2;

  const { data: parents, error: parentError } = await supabase
    .from("parents")
    .insert(
      Array.from({ length: familyCount }, (_, i) => ({
        name: `${FIXTURE_PREFIX} Parent ${i}`,
        email: `${FIXTURE_PREFIX}${suffix}-${i}@fixture.local`,
      })),
    )
    .select("id");

  if (parentError) throw fixtureError("parents", parentError);

  // Identity keys are monotonic, so sorting by id restores insertion order --
  // safer than assuming the driver preserves it.
  const parentIds = parents.map((p) => p.id).sort((a, b) => a - b);

  const { data: students, error: studentError } = await supabase
    .from("students")
    .insert(
      parentIds.map((parentId, i) => ({
        parent_id: parentId,
        name: `${FIXTURE_PREFIX} Child ${i}`,
      })),
    )
    .select("id");

  if (studentError) throw fixtureError("students", studentError);

  const studentIds = students.map((s) => s.id).sort((a, b) => a - b);
  const confirmedAt = new Date().toISOString();

  const { data: bookings, error: bookingError } = await supabase
    .from("bookings")
    .insert(
      studentIds.map((studentId, i) => ({
        student_id: studentId,
        trial_class_id: trialClass.id,
        status:
          i < confirmedCount
            ? BOOKING_STATUS.CONFIRMED
            : BOOKING_STATUS.PENDING_PAYMENT,
        confirmed_at: i < confirmedCount ? confirmedAt : null,
      })),
    )
    .select("id");

  if (bookingError) throw fixtureError("bookings", bookingError);

  const bookingIds = bookings.map((b) => b.id).sort((a, b) => a - b);
  const pending = bookingIds.slice(confirmedCount);

  return {
    classId: trialClass.id,
    bookingAId: pending[0],
    bookingBId: pending[1],
  };
}

// -------------------------------------------------------- building blocks ---
// Smaller pieces for tests that need a specific arrangement rather than the
// batched last-seat setup above.

export async function createParentAndChild(): Promise<{
  parentId: number;
  studentId: number;
}> {
  const supabase = createServerSupabaseClient();
  const suffix = uniqueSuffix();

  const { data: parent, error: parentError } = await supabase
    .from("parents")
    .insert({
      name: `${FIXTURE_PREFIX} Parent ${suffix}`,
      email: `${FIXTURE_PREFIX}${suffix}@fixture.local`,
    })
    .select("id")
    .single();

  if (parentError) throw fixtureError("parent", parentError);

  const { data: student, error: studentError } = await supabase
    .from("students")
    .insert({ parent_id: parent.id, name: `${FIXTURE_PREFIX} Child ${suffix}` })
    .select("id")
    .single();

  if (studentError) throw fixtureError("student", studentError);

  return { parentId: parent.id, studentId: student.id };
}

export async function createTrialClass(capacity = 4): Promise<number> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("trial_classes")
    .insert({
      name: `${FIXTURE_PREFIX} Class ${uniqueSuffix()}`,
      starts_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      capacity,
    })
    .select("id")
    .single();

  if (error) throw fixtureError("trial class", error);

  return data.id;
}

/**
 * Inserts a booking directly, bypassing the commands.
 *
 * For arranging a starting state -- not for exercising behaviour. A cancelled
 * booking must carry a reason, and a confirmed one must carry a timestamp, or
 * the coherence constraints reject the row.
 */
export async function insertBooking(
  studentId: number,
  classId: number,
  status: "pending_payment" | "confirmed" | "payment_failed" | "cancelled",
  cancellationReason: "class_full" | null = null,
): Promise<number> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      student_id: studentId,
      trial_class_id: classId,
      status,
      confirmed_at: status === "confirmed" ? new Date().toISOString() : null,
      cancellation_reason: status === "cancelled" ? (cancellationReason ?? "class_full") : null,
    })
    .select("id")
    .single();

  if (error) throw fixtureError("booking", error);

  return data.id;
}

// ------------------------------------------------------------ assertions ---

export async function getConfirmedCount(classId: number): Promise<number> {
  const supabase = createServerSupabaseClient();

  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("trial_class_id", classId)
    .eq("status", BOOKING_STATUS.CONFIRMED);

  if (error) throw fixtureError("confirmed count", error);

  return count ?? 0;
}

export async function getBookingRow(bookingId: number) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("bookings")
    .select("id, status, cancellation_reason, confirmed_at")
    .eq("id", bookingId)
    .single();

  if (error) throw fixtureError("booking row", error);

  return data;
}

export async function getPaymentAttempts(bookingId: number) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("payment_attempts")
    .select("id, status, reason")
    .eq("booking_id", bookingId)
    .order("id", { ascending: true });

  if (error) throw fixtureError("payment attempts", error);

  return data;
}

// --------------------------------------------------------------- cleanup ---

/**
 * Removes every fixture row, in foreign-key order. Runs once after all test
 * files, from globalSetup's teardown -- never mid-run, where it could delete
 * another file's data.
 *
 * Without this, each `npm test` would leave 20-plus classes behind and the
 * booking page would become unusable for the demo.
 */
export async function cleanupFixtures(): Promise<void> {
  const supabase = createServerSupabaseClient();

  const { data: classes } = await supabase
    .from("trial_classes")
    .select("id")
    .like("name", `${FIXTURE_PREFIX}%`);

  const { data: parents } = await supabase
    .from("parents")
    .select("id")
    .like("email", `${FIXTURE_PREFIX}%`);

  const classIds = (classes ?? []).map((c) => c.id);
  const parentIds = (parents ?? []).map((p) => p.id);

  if (classIds.length > 0) {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id")
      .in("trial_class_id", classIds);

    const bookingIds = (bookings ?? []).map((b) => b.id);

    if (bookingIds.length > 0) {
      await supabase.from("payment_attempts").delete().in("booking_id", bookingIds);
      await supabase.from("bookings").delete().in("id", bookingIds);
    }
  }

  if (parentIds.length > 0) {
    await supabase.from("students").delete().in("parent_id", parentIds);
    await supabase.from("parents").delete().in("id", parentIds);
  }

  if (classIds.length > 0) {
    await supabase.from("trial_classes").delete().in("id", classIds);
  }
}
