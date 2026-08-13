"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { resolveDemoParentId } from "@/shared/demo-session";

import { createBookingSchema } from "../booking.schema";
import { createBooking } from "../commands/create-booking";

// redirect() throws internally, so nothing here may sit inside a try/catch --
// a catch block would swallow the navigation.
export async function createBookingAction(formData: FormData): Promise<void> {
  // From the cookie, never the form: a hidden field would let anyone book on
  // another family's behalf.
  const parentId = await resolveDemoParentId();

  if (parentId === null) {
    redirect("/?error=no_parent");
  }

  const parsed = createBookingSchema.safeParse({
    parentId,
    studentId: formData.get("studentId"),
    classId: formData.get("classId"),
  });

  if (!parsed.success) {
    redirect("/?error=invalid_input");
  }

  const result = await createBooking(parsed.data);

  switch (result.status) {
    // `duplicate` is not an error -- resume the existing checkout.
    case "created":
    case "duplicate":
      revalidatePath("/");
      redirect(`/bookings/${result.bookingId}`);

    case "class_full":
      redirect("/?error=class_full");

    case "invalid_selection":
      redirect("/?error=invalid_selection");

    case "not_found":
      redirect("/?error=not_found");
  }
}
