import { BookingForm } from "@/features/bookings/components/booking-form";
import { ParentSwitcher } from "@/features/parents/components/parent-switcher";
import { listParentsWithChildren } from "@/features/parents/queries/list-parents-with-children";
import { listTrialClasses } from "@/features/trial-classes/queries/list-trial-classes";
import { resolveDemoParentId } from "@/shared/demo-session";

// Seat counts must never be served from a cache. Next 15+ already leaves these
// uncached by default, so this is explicit documentation rather than a fix --
// but a stale "3 / 4" in a demo about capacity would look like a defect.
export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  class_full:
    "That class filled up before the booking could be created. Nothing was reserved.",
  invalid_selection: "That child does not belong to the selected parent.",
  not_found: "That class or child no longer exists.",
  invalid_input: "That request was not valid.",
  no_parent: "Select a parent to continue.",
};

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, parents, classes, selectedParentId] = await Promise.all([
    searchParams,
    listParentsWithChildren(),
    listTrialClasses(),
    resolveDemoParentId(),
  ]);

  const parent = parents.find((p) => p.id === selectedParentId) ?? parents[0];

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Book a trial class
          </h1>
          <p className="mt-1 text-sm text-muted">
            Pick a child and a class. Payment is simulated on the next screen.
          </p>
        </div>

        <ParentSwitcher parents={parents} selectedParentId={parent?.id ?? null} />
      </div>

      {error && ERROR_MESSAGES[error] ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
          {ERROR_MESSAGES[error]}
        </p>
      ) : null}

      {parent ? (
        <BookingForm parent={parent} classes={classes} />
      ) : (
        <p className="text-sm text-muted">
          No parents found. Run{" "}
          <code className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-xs">
            npm run db:reset
          </code>{" "}
          to load the seed data.
        </p>
      )}
    </main>
  );
}
