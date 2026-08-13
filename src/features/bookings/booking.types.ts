// Statuses are `text` with CHECK constraints in the database, so generated
// types say `string` and cannot verify these. This is the one place the
// literals appear; reads cast to the union at the query boundary.

export const BOOKING_STATUS = {
  PENDING_PAYMENT: "pending_payment",
  CONFIRMED: "confirmed",
  PAYMENT_FAILED: "payment_failed",
  CANCELLED: "cancelled",
} as const;

export type BookingStatus =
  (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const CANCELLATION_REASON = {
  CLASS_FULL: "class_full",
} as const;

export type CancellationReason =
  (typeof CANCELLATION_REASON)[keyof typeof CANCELLATION_REASON];

export const PAYMENT_STATUS = {
  CAPTURED: "captured",
  /** Provider declined. */
  FAILED: "failed",
  /** Authorisation released, never captured. Not a refund. */
  VOIDED: "voided",
} as const;

export type PaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

// Must stay in step with migration 003. The mappers throw on anything
// unrecognised, so a mismatch fails loudly.

export const CONFIRM_RESULT = {
  CONFIRMED: "confirmed",
  CLASS_FULL: "class_full",
  ALREADY_CONFIRMED: "already_confirmed",
  INVALID_STATUS: "invalid_status",
  NOT_FOUND: "not_found",
} as const;

export const FAIL_RESULT = {
  PAYMENT_FAILED: "payment_failed",
  INVALID_STATUS: "invalid_status",
  NOT_FOUND: "not_found",
} as const;

/** `already_confirmed` is a success: replaying a completed operation. */
export type CompletePaymentResult =
  | { success: true; status: "confirmed" }
  | { success: true; status: "already_confirmed" }
  | { success: false; status: "class_full" }
  | { success: false; status: "invalid_status" }
  | { success: false; status: "not_found" };

export type FailPaymentResult =
  | { success: true; status: "payment_failed" }
  | { success: false; status: "invalid_status" }
  | { success: false; status: "not_found" };

/** `duplicate` carries the existing id so the action can redirect into it. */
export type CreateBookingResult =
  | { status: "created"; bookingId: number }
  | { status: "duplicate"; bookingId: number }
  | { status: "class_full" }
  | { status: "invalid_selection" }
  | { status: "not_found" };
