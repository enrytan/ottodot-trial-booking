import { formatClassTime } from "@/shared/format";

import type { Roster } from "../queries/get-roster";

export function RosterTable({ roster }: { roster: Roster }) {
  const { trialClass, students } = roster;
  const isFull = trialClass.confirmedCount >= trialClass.capacity;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {trialClass.name}
        </h1>
        <p className="text-sm text-muted">
          {formatClassTime(trialClass.startsAt)}
        </p>

        <p
          className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${
            isFull
              ? "bg-surface-raised text-muted"
              : "bg-emerald-500/10 text-emerald-700"
          }`}
        >
          {trialClass.confirmedCount} of {trialClass.capacity} confirmed
        </p>
      </header>

      {students.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          No confirmed students yet.
        </p>
      ) : (
        <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
          {students.map((student, index) => (
            <li key={student.id} className="flex items-center gap-4 px-4 py-3">
              <span className="w-4 text-sm tabular-nums text-muted">
                {index + 1}
              </span>
              <span className="font-medium">{student.name}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
