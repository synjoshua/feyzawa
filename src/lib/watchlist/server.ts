import { getCompanyAllowlist } from "@/lib/ats/allowlist";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Hidden row so we know defaults were seeded and empty ≠ “never set up”. */
export const WATCHLIST_SEED_MARKER = "__feyzawa_seeded__";

export type WatchlistRow = {
  id?: string;
  company_name: string;
  provider?: string | null;
  board_token?: string | null;
};

function defaultWatchRows(): WatchlistRow[] {
  return getCompanyAllowlist()
    .filter((c) => c.watchedByDefault)
    .map((c) => ({
      company_name: c.name,
      provider: c.provider,
      board_token: c.boardToken,
    }));
}

/**
 * Load the signed-in user's watchlist.
 * First visit (no seed marker): seed allowlist defaults into Supabase so
 * Watch/Unwatch actually persists instead of bouncing back to defaults.
 */
export async function loadUserWatchlist(userId: string): Promise<{
  items: WatchlistRow[];
  source: "supabase" | "allowlist-defaults" | "empty";
}> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { items: defaultWatchRows(), source: "allowlist-defaults" };
  }

  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", userId)
    .order("company_name");

  if (error) {
    console.error("watchlist load failed", error.message);
    return { items: defaultWatchRows(), source: "allowlist-defaults" };
  }

  const rows = (data ?? []) as WatchlistRow[];
  const seeded = rows.some((r) => r.company_name === WATCHLIST_SEED_MARKER);
  const visible = rows.filter((r) => r.company_name !== WATCHLIST_SEED_MARKER);

  if (!seeded) {
    const defaults = defaultWatchRows();
    const payload = [
      {
        user_id: userId,
        company_name: WATCHLIST_SEED_MARKER,
        provider: null,
        board_token: null,
      },
      ...defaults.map((d) => ({
        user_id: userId,
        company_name: d.company_name,
        provider: d.provider ?? null,
        board_token: d.board_token ?? null,
      })),
    ];

    const { error: seedError } = await supabase
      .from("watchlist")
      .upsert(payload, { onConflict: "user_id,company_name" });

    if (seedError) {
      console.error("watchlist seed failed", seedError.message);
      // Still return defaults for this request so UI isn't empty
      return { items: defaults, source: "allowlist-defaults" };
    }

    const { data: after } = await supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", userId)
      .order("company_name");

    return {
      items: ((after ?? []) as WatchlistRow[]).filter(
        (r) => r.company_name !== WATCHLIST_SEED_MARKER,
      ),
      source: "supabase",
    };
  }

  return {
    items: visible,
    source: visible.length ? "supabase" : "empty",
  };
}

/** Company names for the home watch strip (signed-in → DB; else defaults). */
export async function getWatchedCompanyNames(
  userId: string | null | undefined,
): Promise<string[]> {
  if (!userId) {
    return defaultWatchRows().map((r) => r.company_name);
  }
  const { items } = await loadUserWatchlist(userId);
  return items.map((i) => i.company_name);
}
