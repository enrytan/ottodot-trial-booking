"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { setSelectedParentId } from "@/shared/demo-session";

const parentIdSchema = z.coerce.number().int().positive();

export async function selectParentAction(formData: FormData): Promise<void> {
  const parsed = parentIdSchema.safeParse(formData.get("parentId"));

  if (!parsed.success) return;

  await setSelectedParentId(parsed.data);

  revalidatePath("/");
  redirect("/");
}
