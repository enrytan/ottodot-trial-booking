import { describe, expect, it } from "vitest";

import { completePayment } from "@/features/bookings/commands/complete-payment";

import {
  createLastSeatFixture,
  getBookingRow,
  getConfirmedCount,
  getPaymentAttempts,
} from "../helpers/db";

/**
 * Integration tests against real PostgreSQL. Mocks cannot demonstrate that
 * FOR UPDATE serialises anything.
 */
describe("last-seat race", () => {
  const ITERATIONS = 20;

  it("confirms exactly one of two simultaneous payments for the final seat", async () => {
    for (let iteration = 0; iteration < ITERATIONS; iteration++) {
      const fixture = await createLastSeatFixture({
        capacity: 4,
        confirmedCount: 3,
      });

      // Each RPC is its own HTTP request on its own connection, so both
      // transactions really are in flight at once.
      const [resultA, resultB] = await Promise.all([
        completePayment(fixture.bookingAId),
        completePayment(fixture.bookingBId),
      ]);

      expect(
        [resultA.status, resultB.status].sort(),
        `iteration ${iteration}`,
      ).toEqual(["class_full", "confirmed"]);

      // The invariant. Everything above could pass while the database held
      // five students; this is what catches that.
      expect(await getConfirmedCount(fixture.classId)).toBe(4);

      const winnerId =
        resultA.status === "confirmed" ? fixture.bookingAId : fixture.bookingBId;
      const loserId =
        resultA.status === "confirmed" ? fixture.bookingBId : fixture.bookingAId;

      const winner = await getBookingRow(winnerId);
      expect(winner.status).toBe("confirmed");
      expect(winner.confirmed_at).not.toBeNull();
      expect(winner.cancellation_reason).toBeNull();

      const loser = await getBookingRow(loserId);
      expect(loser.status).toBe("cancelled");
      expect(loser.cancellation_reason).toBe("class_full");
      expect(loser.confirmed_at).toBeNull();

      // The loser's authorisation is voided rather than captured, so no charge
      // ever occurs.
      const winnerPayments = await getPaymentAttempts(winnerId);
      expect(winnerPayments).toHaveLength(1);
      expect(winnerPayments[0].status).toBe("captured");
      expect(winnerPayments[0].reason).toBeNull();

      const loserPayments = await getPaymentAttempts(loserId);
      expect(loserPayments).toHaveLength(1);
      expect(loserPayments[0].status).toBe("voided");
      expect(loserPayments[0].reason).toBe("class_full");
    }
  });

  it("is idempotent when the same booking is confirmed twice", async () => {
    const fixture = await createLastSeatFixture({ capacity: 4, confirmedCount: 3 });

    const first = await completePayment(fixture.bookingAId);
    const second = await completePayment(fixture.bookingAId);

    expect(first).toEqual({ success: true, status: "confirmed" });
    expect(second).toEqual({ success: true, status: "already_confirmed" });

    expect(await getConfirmedCount(fixture.classId)).toBe(4);
    expect(await getPaymentAttempts(fixture.bookingAId)).toHaveLength(1);
  });

  it("rejects the second booking once the class is already full", async () => {
    const fixture = await createLastSeatFixture({ capacity: 4, confirmedCount: 3 });

    expect((await completePayment(fixture.bookingAId)).status).toBe("confirmed");
    expect((await completePayment(fixture.bookingBId)).status).toBe("class_full");

    expect(await getConfirmedCount(fixture.classId)).toBe(4);
  });
});
