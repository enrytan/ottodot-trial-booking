import { describe, expect, it } from "vitest";

import { completePayment } from "@/features/bookings/commands/complete-payment";
import { createBooking } from "@/features/bookings/commands/create-booking";
import { failPayment } from "@/features/bookings/commands/fail-payment";

import { createParentAndChild, createTrialClass } from "../helpers/db";

/** A child cannot hold two active bookings for the same class. */
describe("duplicate bookings", () => {
  it("returns the existing pending booking rather than creating a second", async () => {
    const { parentId, studentId } = await createParentAndChild();
    const classId = await createTrialClass(4);

    const first = await createBooking({ parentId, studentId, classId });
    expect(first).toEqual({ status: "created", bookingId: expect.any(Number) });

    const second = await createBooking({ parentId, studentId, classId });

    // Not an error: without this, an abandoned pending booking would lock the
    // child out of the class permanently -- there is no expiry job.
    expect(second).toEqual({
      status: "duplicate",
      bookingId: first.status === "created" ? first.bookingId : -1,
    });
  });

  it("blocks a second booking once the first is confirmed", async () => {
    const { parentId, studentId } = await createParentAndChild();
    const classId = await createTrialClass(4);

    const first = await createBooking({ parentId, studentId, classId });
    if (first.status !== "created") throw new Error("setup failed");

    await completePayment(first.bookingId);

    const second = await createBooking({ parentId, studentId, classId });
    expect(second).toEqual({ status: "duplicate", bookingId: first.bookingId });
  });

  it("is enforced by the database when two requests arrive together", async () => {
    const { parentId, studentId } = await createParentAndChild();
    const classId = await createTrialClass(4);

    // Both pass the pre-check, then one INSERT loses to the unique index --
    // the path the pre-check alone cannot cover.
    const [a, b] = await Promise.all([
      createBooking({ parentId, studentId, classId }),
      createBooking({ parentId, studentId, classId }),
    ]);

    expect([a.status, b.status].sort()).toEqual(["created", "duplicate"]);

    // Both point at the same booking -- the loser is redirected, not errored.
    const idA = "bookingId" in a ? a.bookingId : null;
    const idB = "bookingId" in b ? b.bookingId : null;
    expect(idA).toBe(idB);
  });

  it("allows a fresh booking after a declined payment", async () => {
    const { parentId, studentId } = await createParentAndChild();
    const classId = await createTrialClass(4);

    const first = await createBooking({ parentId, studentId, classId });
    if (first.status !== "created") throw new Error("setup failed");

    await failPayment(first.bookingId);

    // payment_failed sits outside the partial unique index.
    const second = await createBooking({ parentId, studentId, classId });
    expect(second.status).toBe("created");
  });

  it("rejects a child that does not belong to the selected parent", async () => {
    const family = await createParentAndChild();
    const other = await createParentAndChild();
    const classId = await createTrialClass(4);

    const result = await createBooking({
      parentId: family.parentId,
      studentId: other.studentId,
      classId,
    });

    expect(result).toEqual({ status: "invalid_selection" });
  });
});
