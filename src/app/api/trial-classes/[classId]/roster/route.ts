import { getRoster } from "@/features/roster/queries/get-roster";

export const dynamic = "force-dynamic";

/**
 * The roster as JSON, for an admin or teacher tool.
 *
 * A Route Handler rather than a Server Action because this is a genuine HTTP
 * API with callers outside our own UI. Booking mutations stay Server Actions,
 * since only this app invokes them.
 *
 * It calls the same getRoster() as the roster page -- one implementation, so
 * the page and the API can never report different rosters.
 *
 * Unauthenticated, deliberately: there is no auth in this slice. In production
 * this would require teacher or admin authorization.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ classId: string }> },
) {
  const { classId } = await context.params;

  const id = Number(classId);

  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "invalid_class_id" }, { status: 400 });
  }

  const roster = await getRoster(id);

  if (!roster) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json({
    class: {
      id: roster.trialClass.id,
      name: roster.trialClass.name,
      startsAt: roster.trialClass.startsAt,
      capacity: roster.trialClass.capacity,
      confirmedCount: roster.trialClass.confirmedCount,
    },
    students: roster.students.map((student) => ({
      id: student.id,
      name: student.name,
    })),
  });
}
