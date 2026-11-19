import { SiteHeader } from "@/components/SiteHeader";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { getCompanyAllowlist } from "@/lib/ats/allowlist";
import { isSupabaseAuthConfigured } from "@/lib/supabase/admin";
import {
  createServerSupabaseClient,
  getCurrentUser,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const allowlist = getCompanyAllowlist();
  const configured = isSupabaseAuthConfigured();
  const user = await getCurrentUser();

  let initial: Array<{
    id?: string;
    company_name: string;
    provider?: string | null;
    board_token?: string | null;
  }> = allowlist
    .filter((c) => c.watchedByDefault)
    .map((c) => ({
      company_name: c.name,
      provider: c.provider,
      board_token: c.boardToken,
    }));

  if (configured && user) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from("watchlist")
        .select("*")
        .eq("user_id", user.id);
      if (data && data.length > 0) {
        initial = data.map((row) => ({
          id: row.id as string,
          company_name: row.company_name as string,
          provider: row.provider as string | null,
          board_token: row.board_token as string | null,
        }));
      }
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader active="/watchlist" />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <h1 className="brand-display text-4xl text-ink">Company watchlist</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Allowlisted boards with verified Greenhouse / Lever / Ashby tokens.
            Watching is personal once you sign in.
          </p>
        </div>
        <WatchlistPanel
          allowlist={allowlist}
          initial={initial}
          configured={configured}
          signedIn={Boolean(user)}
        />
      </main>
    </div>
  );
}
