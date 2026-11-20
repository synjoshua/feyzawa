import { PageShell } from "@/components/PageShell";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { getCompanyAllowlist } from "@/lib/ats/allowlist";
import { isSupabaseAuthConfigured } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/server";
import { loadUserWatchlist } from "@/lib/watchlist/server";

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
    const { items } = await loadUserWatchlist(user.id);
    initial = items;
  }

  return (
    <PageShell
      active="/watchlist"
      eyebrow="Companies"
      title="Watchlist"
      description="Companies you follow. Sign in once — Watch / Unwatch saves to your account."
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
