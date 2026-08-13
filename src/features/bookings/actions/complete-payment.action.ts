"use server";

import { revalidatePath } from "next/cache";

import { bookingIdSchema } from "../booking.schema";
import { completePayment } from "../commands/complete-payment";

export async function completePaymentAction(formData: FormData): Promise<void> {
  const parsed = bookingIdSchema.safeParse(formData.get("bookingId"));

  if (!parsed.success) return;

  const bookingId = parsed.data;

  // Result ignored: every outcome is recorded on the booking row, and the page
  // re-reads it. No redirect -- the status page re-renders in place.
  await completePayment(bookingId);

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/");
  // Bracket form invalidates every roster page without needing the class id.
  revalidatePath("/roster/[classId]", "page");
}
