import { PageShell } from "@/components/PageShell";
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
    <PageShell
      active="/watchlist"
      eyebrow="Companies"
      title="Watchlist"
      description="Allowlisted boards with verified Greenhouse / Lever / Ashby tokens. Watching is personal once you sign in."
    >
      <WatchlistPanel
        initial={initial}
        allowlist={allowlist}
        configured={configured}
        signedIn={Boolean(user)}
      />
    </PageShell>
  );
}
