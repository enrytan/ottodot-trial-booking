import { completePaymentAction } from "../actions/complete-payment.action";
import { failPaymentAction } from "../actions/fail-payment.action";

import { SubmitButton } from "./submit-button";

/**
 * Mock payment. Two explicit buttons rather than a fake card form, so every
 * scenario is deterministic and repeatable.
 */
export function PaymentActions({ bookingId }: { bookingId: number }) {
  return (
    <div className="flex flex-wrap gap-3">
      <form action={completePaymentAction}>
        <input type="hidden" name="bookingId" value={bookingId} />
        <SubmitButton
          pendingLabel="Processing…"
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Simulate successful payment
        </SubmitButton>
      </form>

      <form action={failPaymentAction}>
        <input type="hidden" name="bookingId" value={bookingId} />
        <SubmitButton
          pendingLabel="Processing…"
          className="bg-red-600 text-white hover:bg-red-700"
        >
          Simulate failed payment
        </SubmitButton>
      </form>
    </div>
  );
}
