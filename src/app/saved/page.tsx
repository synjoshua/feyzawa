import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { isSupabaseAuthConfigured } from "@/lib/supabase/admin";
import {
  createServerSupabaseClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { relativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const configured = isSupabaseAuthConfigured();
  const user = await getCurrentUser();

  let saved: Array<{
    id: string;
    title_snapshot: string;
    company_snapshot: string;
    apply_url: string | null;
    location_snapshot: string | null;
    job_id: string | null;
    updated_at: string;
  }> = [];

  if (configured && user) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from("applications")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "saved")
        .order("updated_at", { ascending: false });
      saved = (data ?? []) as typeof saved;
    }
  }

  return (
    <PageShell
      active="/saved"
      eyebrow="Bookmarks"
      title="Saved"
      description="Roles you bookmarked. Toggle the bookmark on any listing to add or remove."
    >
      {!user ? (
        <p className="rounded-2xl border border-[var(--line)] bg-porcelain p-5 text-sm text-ink-soft shadow-panel">
          <Link href="/login" className="text-gold hover:underline">
            Sign in
          </Link>{" "}
          to sync saved roles across devices. Without signing in, bookmarks stay
          on this browser via the tracker local store — open{" "}
          <Link href="/tracker" className="text-gold hover:underline">
            Tracker → saved
          </Link>
          .
        </p>
      ) : null}

      <ul className="mt-4 tea-surface divide-y divide-[var(--line)] overflow-hidden rounded-[1.25rem]">
        {saved.length === 0 ? (
          <li className="px-4 py-12 text-center text-sm text-ink-soft">
            No bookmarks yet. Tap the bookmark icon on any role on the board.
          </li>
        ) : (
          saved.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium text-ink">{row.title_snapshot}</p>
                <p className="text-xs text-ink-soft">
                  {row.company_snapshot}
                  {row.location_snapshot ? ` · ${row.location_snapshot}` : ""}
                  {" · "}
                  saved {relativeTime(row.updated_at)}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {row.job_id ? (
                  <Link
                    href={`/jobs/${row.job_id}`}
                    className="focus-ring rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-ink-soft"
                  >
                    Details
                  </Link>
                ) : null}
                {row.apply_url ? (
                  <a
                    href={row.apply_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring rounded-full bg-jade px-3 py-1.5 text-xs font-medium text-porcelain"
                  >
                    Apply
                  </a>
                ) : null}
                <Link
                  href="/tracker"
                  className="focus-ring rounded-full border border-gold/40 bg-chartreuse/15 px-3 py-1.5 text-xs text-ink"
                >
                  Tracker
                </Link>
              </div>
            </li>
          ))
        )}
      </ul>
    </PageShell>
  );
}
