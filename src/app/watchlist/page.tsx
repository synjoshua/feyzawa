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

  // Opt-in only — never pre-select defaults
  let initial: Array<{
    id?: string;
    company_name: string;
    provider?: string | null;
    board_token?: string | null;
  }> = [];

  if (configured && user) {
    const { items } = await loadUserWatchlist(user.id);
    initial = items;
  }

  return (
    <PageShell
      active="/watchlist"
      signedIn={Boolean(user)}
      eyebrow="Companies"
      title="Watchlist"
      description="Nothing is watched by default. Tap Watch on companies you care about — that list shows up under Company watch on home."
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
