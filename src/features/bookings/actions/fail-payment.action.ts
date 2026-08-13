"use server";

import { revalidatePath } from "next/cache";

import { bookingIdSchema } from "../booking.schema";
import { failPayment } from "../commands/fail-payment";

export async function failPaymentAction(formData: FormData): Promise<void> {
  const parsed = bookingIdSchema.safeParse(formData.get("bookingId"));

  if (!parsed.success) return;

  const bookingId = parsed.data;

  await failPayment(bookingId);

  revalidatePath(`/bookings/${bookingId}`);
  // No roster revalidation -- a failure consumes no seat.
  revalidatePath("/");
}
