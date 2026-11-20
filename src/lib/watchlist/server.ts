import { createServerSupabaseClient } from "@/lib/supabase/server";

export type WatchlistRow = {
  id?: string;
  company_name: string;
  provider?: string | null;
  board_token?: string | null;
};

/**
 * Load the signed-in user's watchlist from Supabase.
 * Empty by default — nothing is pre-watched; users opt in per company.
 */
export async function loadUserWatchlist(userId: string): Promise<{
  items: WatchlistRow[];
  source: "supabase" | "empty" | "error";
}> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { items: [], source: "empty" };
  }

  // Drop leftover seed marker from an earlier auto-default experiment
  await supabase
    .from("watchlist")
    .delete()
    .eq("user_id", userId)
    .eq("company_name", "__feyzawa_seeded__");

  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", userId)
    .order("company_name");

  if (error) {
    console.error("watchlist load failed", error.message);
    return { items: [], source: "error" };
  }

  const items = ((data ?? []) as WatchlistRow[]).filter(
    (r) => r.company_name !== "__feyzawa_seeded__",
  );
  return {
    items,
    source: items.length ? "supabase" : "empty",
  };
}

/** Company names for the home watch strip. Signed-out → empty (opt-in only). */
export async function getWatchedCompanyNames(
  userId: string | null | undefined,
): Promise<string[]> {
  if (!userId) return [];
  const { items } = await loadUserWatchlist(userId);
  return items.map((i) => i.company_name);
}
