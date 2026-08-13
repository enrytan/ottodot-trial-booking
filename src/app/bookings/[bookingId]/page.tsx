import Link from "next/link";
import { notFound } from "next/navigation";

import { BOOKING_STATUS } from "@/features/bookings/booking.types";
import {
  BookingStatusBadge,
  BookingStatusMessage,
} from "@/features/bookings/components/booking-status";
import { PaymentActions } from "@/features/bookings/components/payment-actions";
import { getBooking } from "@/features/bookings/queries/get-booking";
import { formatClassTime } from "@/shared/format";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;

  // Route params are untrusted strings. Anything that is not a positive
  // integer is a 404, not a database round trip.
  const id = Number(bookingId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const booking = await getBooking(id);
  if (!booking) notFound();

  const isPending = booking.status === BOOKING_STATUS.PENDING_PAYMENT;

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-6 py-10">
      <Link
        href="/"
        className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
      >
        ← Back to booking
      </Link>

      <div className="space-y-5 rounded-xl border border-line bg-surface p-6 shadow-sm">
        <header className="space-y-1">
          <p className="text-sm text-muted">Booking #{booking.id}</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {booking.student.name}
          </h1>
          <p className="text-sm text-muted">
            {booking.trialClass.name} ·{" "}
            {formatClassTime(booking.trialClass.startsAt)}
          </p>
        </header>

        <div className="space-y-3 border-t border-line pt-5">
          <BookingStatusBadge status={booking.status} />
          <BookingStatusMessage
            status={booking.status}
            cancellationReason={booking.cancellationReason}
          />
        </div>

        {isPending ? (
          <div className="space-y-3 border-t border-line pt-5">
            <h2 className="text-sm font-medium">Mock payment</h2>
            <PaymentActions bookingId={booking.id} />
          </div>
        ) : (
          <div className="border-t border-line pt-5">
            <Link
              href={`/roster/${booking.trialClass.id}`}
              className="text-sm text-accent-strong underline-offset-4 hover:underline"
            >
              View class roster →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
