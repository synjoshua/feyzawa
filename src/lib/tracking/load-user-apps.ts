import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApplicationRecord } from "./types";

/** Server-side load of the signed-in user's applications (empty if signed out). */
export async function loadUserApplications(
  userId: string | undefined | null,
): Promise<ApplicationRecord[]> {
  if (!userId) return [];
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map((row) => ({
    id: String(row.id),
    job_id: (row.job_id as string) ?? null,
    title_snapshot: String(row.title_snapshot ?? ""),
    company_snapshot: String(row.company_snapshot ?? ""),
    apply_url: (row.apply_url as string) ?? null,
    location_snapshot: (row.location_snapshot as string) ?? null,
    status: row.status as ApplicationRecord["status"],
    notes: String(row.notes ?? ""),
    applied_at: (row.applied_at as string) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    source: "supabase" as const,
  }));
}
