import "server-only";

import { createServerSupabaseClient } from "@/shared/database/supabase-server";

import { CONFIRM_RESULT, type CompletePaymentResult } from "../booking.types";

export async function completePayment(
  bookingId: number,
): Promise<CompletePaymentResult> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.rpc("confirm_booking", {
    p_booking_id: bookingId,
  });

  // Business outcomes ('class_full' and friends) come back as values. An
  // `error` means the call itself failed, which the UI cannot act on.
  if (error) {
    throw new Error(`confirm_booking failed for booking ${bookingId}`, {
      cause: error,
    });
  }

  return mapConfirmResult(data);
}

/** Generated types report `Returns: string`, so this maps rather than casts. */
function mapConfirmResult(sqlResult: string): CompletePaymentResult {
  switch (sqlResult) {
    case CONFIRM_RESULT.CONFIRMED:
      return { success: true, status: "confirmed" };

    case CONFIRM_RESULT.ALREADY_CONFIRMED:
      return { success: true, status: "already_confirmed" };

    case CONFIRM_RESULT.CLASS_FULL:
      return { success: false, status: "class_full" };

    case CONFIRM_RESULT.INVALID_STATUS:
      return { success: false, status: "invalid_status" };

    case CONFIRM_RESULT.NOT_FOUND:
      return { success: false, status: "not_found" };

    default:
      throw new Error(
        `confirm_booking returned an unrecognised result: ${sqlResult}`,
      );
  }
}
