import { z } from "zod";

// Server Actions are public HTTP endpoints, so their input is untrusted
// regardless of what the form appears to send. Commands assume validated input.
// `coerce` because FormData values are always strings.
const positiveId = z.coerce.number().int().positive();

export const bookingIdSchema = positiveId;

export const createBookingSchema = z.object({
  parentId: positiveId,
  studentId: positiveId,
  classId: positiveId,
});

export type CreateBookingSchemaInput = z.infer<typeof createBookingSchema>;
