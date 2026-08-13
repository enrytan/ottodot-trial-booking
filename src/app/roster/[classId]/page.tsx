import Link from "next/link";
import { notFound } from "next/navigation";

import { RosterTable } from "@/features/roster/components/roster-table";
import { getRoster } from "@/features/roster/queries/get-roster";

export const dynamic = "force-dynamic";

export default async function RosterPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;

  const id = Number(classId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const roster = await getRoster(id);
  if (!roster) notFound();

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-6 py-10">
      <Link
        href="/"
        className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
      >
        ← Back to booking
      </Link>

      <RosterTable roster={roster} />

      <p className="text-sm text-muted">
        Same data as JSON:{" "}
        <a
          href={`/api/trial-classes/${id}/roster`}
          className="font-mono text-xs text-accent-strong underline-offset-4 hover:underline"
        >
          /api/trial-classes/{id}/roster
        </a>
      </p>
    </main>
  );
}
