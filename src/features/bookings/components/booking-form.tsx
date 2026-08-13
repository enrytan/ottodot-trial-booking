import Link from "next/link";

import type { ParentWithChildren } from "@/features/parents/queries/list-parents-with-children";
import type { TrialClassAvailability } from "@/features/trial-classes/queries/list-trial-classes";
import { formatClassTime } from "@/shared/format";

import { createBookingAction } from "../actions/create-booking.action";

import { SubmitButton } from "./submit-button";

/**
 * One form for both fields: each class's Book button carries `name="classId"`,
 * so a submit button supplies its own value and no client state is needed.
 */
export function BookingForm({
  parent,
  classes,
}: {
  parent: ParentWithChildren;
  classes: TrialClassAvailability[];
}) {
  if (parent.children.length === 0) {
    return (
      <p className="text-sm text-muted">{parent.name} has no children on file.</p>
    );
  }

  return (
    <form action={createBookingAction} className="space-y-8">
      <fieldset>
        <legend className="mb-3 text-sm font-medium">Choose a child</legend>

        <div className="flex flex-wrap gap-2">
          {parent.children.map((child, index) => (
            <label
              key={child.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm shadow-sm transition-colors hover:border-accent has-checked:border-accent has-checked:bg-accent/5"
            >
              <input
                type="radio"
                name="studentId"
                value={child.id}
                defaultChecked={index === 0}
                required
                className="accent-accent"
              />
              <span className="font-medium">{child.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <section>
        <h2 className="mb-3 text-sm font-medium">Available trial classes</h2>

        <ul className="space-y-2">
          {classes.map((trialClass) => {
            const isFull = trialClass.availableSeats <= 0;

            return (
              <li
                key={trialClass.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium">{trialClass.name}</div>
                  <div className="mt-0.5 text-sm text-muted">
                    {formatClassTime(trialClass.startsAt)}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${
                      isFull
                        ? "bg-surface-raised text-muted"
                        : "bg-emerald-500/10 text-emerald-700"
                    }`}
                  >
                    {isFull
                      ? "Full"
                      : `${trialClass.availableSeats} seat${
                          trialClass.availableSeats === 1 ? "" : "s"
                        } left`}
                  </span>

                  <Link
                    href={`/roster/${trialClass.id}`}
                    className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Roster
                  </Link>

                  <SubmitButton
                    name="classId"
                    value={trialClass.id}
                    disabled={isFull}
                    pendingLabel="Booking…"
                  >
                    Book
                  </SubmitButton>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </form>
  );
}
