import "server-only";

import { createServerSupabaseClient } from "@/shared/database/supabase-server";

export type ParentWithChildren = {
  id: number;
  name: string;
  children: { id: number; name: string }[];
};

/**
 * Every parent and their children, for the demo selector and the child radios.
 * A real application would load one parent from the session.
 */
export async function listParentsWithChildren(): Promise<ParentWithChildren[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("parents")
    .select("id, name, students ( id, name )")
    .order("id", { ascending: true });

  if (error) {
    throw new Error("Failed to load parents", { cause: error });
  }

  return (data ?? []).map((parent) => ({
    id: parent.id,
    name: parent.name,
    children: [...parent.students]
      .sort((a, b) => a.id - b.id)
      .map((student) => ({ id: student.id, name: student.name })),
  }));
}
