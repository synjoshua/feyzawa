import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { SavedJobsList } from "@/components/SavedJobsList";
import { loadJobs } from "@/lib/jobs/store";
import { getCurrentUser } from "@/lib/supabase/server";
import { loadUserApplications } from "@/lib/tracking/load-user-apps";
import {
  closedJobIdSet,
  filterOpenSoftApps,
} from "@/lib/tracking/purge-closed";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const user = await getCurrentUser();
  const [{ jobs }, applications] = await Promise.all([
    loadJobs(),
    loadUserApplications(user?.id),
  ]);
  const closedIds = [...closedJobIdSet(jobs)];
  const openApps = filterOpenSoftApps(applications, new Set(closedIds));

  return (
    <PageShell
      active="/saved"
      signedIn={Boolean(user)}
      eyebrow="Bookmarks"
      title="Saved"
      description="Bookmarks float to the top of Open roles. Not interested removes a role from the board entirely — switch to that tab and tap Add back anytime. Closed roles drop off automatically after the daily refresh."
    >
      {!user ? (
        <p className="rounded-2xl border border-[var(--line)] bg-porcelain p-5 text-sm text-ink-soft shadow-panel">
          <Link href="/login" className="text-gold hover:underline">
            Sign in
          </Link>{" "}
          to sync bookmarks across devices. Without signing in, they stay on
          this browser.
        </p>
      ) : null}

      <div className="mt-4 tea-surface overflow-hidden rounded-[1.25rem]">
        <SavedJobsList initial={openApps} closedJobIds={closedIds} />
      </div>
    </PageShell>
  );
}
