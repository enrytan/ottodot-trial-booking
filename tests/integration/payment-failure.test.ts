import { describe, expect, it } from "vitest";

import { completePayment } from "@/features/bookings/commands/complete-payment";
import { createBooking } from "@/features/bookings/commands/create-booking";
import { failPayment } from "@/features/bookings/commands/fail-payment";
import { getRoster } from "@/features/roster/queries/get-roster";

import {
  createParentAndChild,
  createTrialClass,
  getBookingRow,
  getConfirmedCount,
  getPaymentAttempts,
} from "../helpers/db";

/**
 * "A failed payment must never put a child on the roster."
 *
 * fail_booking_payment() locks only the booking row -- no class lock, because a
 * decline cannot consume a seat. The status change and its audit row are
 * written in one transaction, so they cannot disagree.
 */
describe("payment failure", () => {
  async function arrangePendingBooking() {
    const { parentId, studentId } = await createParentAndChild();
    const classId = await createTrialClass(4);

    const created = await createBooking({ parentId, studentId, classId });
    if (created.status !== "created") throw new Error("setup failed");

    return { parentId, studentId, classId, bookingId: created.bookingId };
  }

  it("records the decline and consumes no seat", async () => {
    const { classId, bookingId } = await arrangePendingBooking();

    expect(await failPayment(bookingId)).toEqual({
      success: true,
      status: "payment_failed",
    });

    const booking = await getBookingRow(bookingId);
    expect(booking.status).toBe("payment_failed");
    expect(booking.confirmed_at).toBeNull();
    expect(booking.cancellation_reason).toBeNull();

    expect(await getConfirmedCount(classId)).toBe(0);
  });

  it("writes exactly one failed payment attempt, with a reason", async () => {
    const { bookingId } = await arrangePendingBooking();
    await failPayment(bookingId);

    const attempts = await getPaymentAttempts(bookingId);
    expect(attempts).toHaveLength(1);
    expect(attempts[0].status).toBe("failed");
    expect(attempts[0].reason).toBe("card_declined");
  });

  it("keeps the child off the roster", async () => {
    const { classId, bookingId } = await arrangePendingBooking();
    await failPayment(bookingId);

    const roster = await getRoster(classId);

    // Absent by construction -- getRoster queries status = 'confirmed', so
    // there is no exclusion rule that could be forgotten.
    expect(roster?.students).toEqual([]);
    expect(roster?.trialClass.confirmedCount).toBe(0);
  });

  it("allows an immediate retry that can succeed", async () => {
    const { parentId, studentId, classId, bookingId } = await arrangePendingBooking();
    await failPayment(bookingId);

    const retry = await createBooking({ parentId, studentId, classId });
    if (retry.status !== "created") throw new Error("retry was not allowed");

    expect(await completePayment(retry.bookingId)).toEqual({
      success: true,
      status: "confirmed",
    });

    expect(await getConfirmedCount(classId)).toBe(1);
  });

  it("cannot fail a booking that is already confirmed", async () => {
    const { classId, bookingId } = await arrangePendingBooking();
    await completePayment(bookingId);

    expect(await failPayment(bookingId)).toEqual({
      success: false,
      status: "invalid_status",
    });

    // The guard must leave the confirmed booking untouched.
    expect(await getConfirmedCount(classId)).toBe(1);
    expect((await getBookingRow(bookingId)).status).toBe("confirmed");
  });

  it("is idempotent when the same failure is submitted twice", async () => {
    const { bookingId } = await arrangePendingBooking();

    expect((await failPayment(bookingId)).status).toBe("payment_failed");
    expect((await failPayment(bookingId)).status).toBe("invalid_status");

    // A second click must not write a second audit row.
    expect(await getPaymentAttempts(bookingId)).toHaveLength(1);
  });

  it("returns not_found for a booking that does not exist", async () => {
    expect(await failPayment(2_000_000_000)).toEqual({
      success: false,
      status: "not_found",
    });
  });
});
