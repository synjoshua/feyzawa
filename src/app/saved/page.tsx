import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { SavedJobsList } from "@/components/SavedJobsList";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const user = await getCurrentUser();

  return (
    <PageShell
      active="/saved"
      eyebrow="Bookmarks"
      title="Saved"
      description="Bookmarks float to the top of Open roles. Not interested removes a role from the board entirely — switch to that tab and tap Add back anytime."
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
        <SavedJobsList />
      </div>
    </PageShell>
  );
}
