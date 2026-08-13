import "server-only";

import { createServerSupabaseClient } from "@/shared/database/supabase-server";

import { FAIL_RESULT, type FailPaymentResult } from "../booking.types";

export async function failPayment(
  bookingId: number,
): Promise<FailPaymentResult> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.rpc("fail_booking_payment", {
    p_booking_id: bookingId,
  });

  if (error) {
    throw new Error(`fail_booking_payment failed for booking ${bookingId}`, {
      cause: error,
    });
  }

  return mapFailResult(data);
}

function mapFailResult(sqlResult: string): FailPaymentResult {
  switch (sqlResult) {
    case FAIL_RESULT.PAYMENT_FAILED:
      return { success: true, status: "payment_failed" };

    case FAIL_RESULT.INVALID_STATUS:
      return { success: false, status: "invalid_status" };

    case FAIL_RESULT.NOT_FOUND:
      return { success: false, status: "not_found" };

    default:
      throw new Error(
        `fail_booking_payment returned an unrecognised result: ${sqlResult}`,
      );
  }
}
