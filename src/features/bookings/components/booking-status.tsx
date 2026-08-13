import { BOOKING_STATUS, type BookingStatus } from "../booking.types";

const PRESENTATION: Record<
  BookingStatus,
  { label: string; dot: string; chip: string; message: string }
> = {
  [BOOKING_STATUS.PENDING_PAYMENT]: {
    label: "Pending payment",
    dot: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-700",
    message:
      "No seat is reserved yet. The seat is claimed at the moment payment completes, not when the class was selected.",
  },
  [BOOKING_STATUS.CONFIRMED]: {
    label: "Confirmed",
    dot: "bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-700",
    message: "Seat confirmed and added to the class roster.",
  },
  [BOOKING_STATUS.PAYMENT_FAILED]: {
    label: "Payment failed",
    dot: "bg-red-500",
    chip: "bg-red-500/10 text-red-700",
    message:
      "The card was declined, so no seat was taken and this child is not on the roster. You can book this class again and retry.",
  },
  [BOOKING_STATUS.CANCELLED]: {
    label: "Cancelled",
    dot: "bg-neutral-400",
    chip: "bg-neutral-500/10 text-muted",
    message:
      "Another family completed payment for the last seat first. Your card was not charged. You can book a different class for this child.",
  },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { label, dot, chip } = PRESENTATION[status];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${chip}`}
    >
      <span className={`size-2 rounded-full ${dot}`} aria-hidden />
      {label}
    </span>
  );
}

export function BookingStatusMessage({
  status,
  cancellationReason,
}: {
  status: BookingStatus;
  cancellationReason: string | null;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm leading-relaxed text-muted">
        {PRESENTATION[status].message}
      </p>

      {/* The stored value, surfaced deliberately for review. */}
      {cancellationReason ? (
        <p className="text-xs text-muted">
          Reason recorded:{" "}
          <code className="rounded bg-surface-raised px-1.5 py-0.5 font-mono">
            {cancellationReason}
          </code>
        </p>
      ) : null}
    </div>
  );
}
