import { describe, expect, it } from "vitest";

import { getRoster } from "@/features/roster/queries/get-roster";

import {
  createParentAndChild,
  createTrialClass,
  insertBooking,
} from "../helpers/db";

/**
 * The roster is derived, not stored.
 *
 * There is no roster table -- it is bookings filtered to confirmed, joined to
 * students. That is why it cannot drift from the rows that are its source of
 * truth, and why every non-confirmed status is absent without any explicit
 * exclusion rule.
 */
describe("roster", () => {
  it("includes confirmed bookings and nothing else", async () => {
    const classId = await createTrialClass(4);

    const confirmed = await createParentAndChild();
    const pending = await createParentAndChild();
    const failed = await createParentAndChild();
    const cancelled = await createParentAndChild();

    await insertBooking(confirmed.studentId, classId, "confirmed");
    await insertBooking(pending.studentId, classId, "pending_payment");
    await insertBooking(failed.studentId, classId, "payment_failed");
    await insertBooking(cancelled.studentId, classId, "cancelled", "class_full");

    const roster = await getRoster(classId);

    expect(roster?.students.map((s) => s.id)).toEqual([confirmed.studentId]);
    expect(roster?.trialClass.confirmedCount).toBe(1);
  });

  it("returns class details for a class with no bookings at all", async () => {
    const classId = await createTrialClass(4);

    const roster = await getRoster(classId);

    // Regression test for a real design bug: reading class metadata THROUGH the
    // bookings join returns no rows for an empty class -- no name, no capacity,
    // nothing to render. The header comes from the availability view instead,
    // which is a LEFT JOIN, so an empty class still produces a row.
    expect(roster).not.toBeNull();
    expect(roster?.trialClass.capacity).toBe(4);
    expect(roster?.trialClass.confirmedCount).toBe(0);
    expect(roster?.trialClass.name).toContain("__test__");
    expect(roster?.students).toEqual([]);
  });

  it("orders students by when they were confirmed", async () => {
    const classId = await createTrialClass(4);

    const first = await createParentAndChild();
    const second = await createParentAndChild();

    await insertBooking(first.studentId, classId, "confirmed");
    await insertBooking(second.studentId, classId, "confirmed");

    const roster = await getRoster(classId);

    expect(roster?.students.map((s) => s.id)).toEqual([
      first.studentId,
      second.studentId,
    ]);
  });

  it("does not leak bookings from other classes", async () => {
    const classA = await createTrialClass(4);
    const classB = await createTrialClass(4);

    const inA = await createParentAndChild();
    const inB = await createParentAndChild();

    await insertBooking(inA.studentId, classA, "confirmed");
    await insertBooking(inB.studentId, classB, "confirmed");

    const roster = await getRoster(classA);

    expect(roster?.students.map((s) => s.id)).toEqual([inA.studentId]);
  });

  it("returns null for a class that does not exist", async () => {
    expect(await getRoster(2_000_000_000)).toBeNull();
  });
});
