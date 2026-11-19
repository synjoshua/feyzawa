import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import {
  TrackerBoard,
  type ApplicationRow,
} from "@/components/TrackerBoard";
import {
  createServerSupabaseClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { isSupabaseAuthConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function TrackerPage() {
  const configured = isSupabaseAuthConfigured();
  const user = await getCurrentUser();

  let applications: ApplicationRow[] = [];
  if (configured && user) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from("applications")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      applications = (data ?? []) as ApplicationRow[];
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader active="/tracker" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 max-w-2xl">
          <h1 className="brand-display text-4xl text-ink">Application tracker</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Saved · Applied · Interviewing · Offer · Rejected. Notes are private
            to your signed-in account and never shown on the public board.
          </p>
          {!user && configured ? (
            <p className="mt-3 text-sm text-amber">
              <Link href="/login?next=/tracker" className="underline">
                Sign in
              </Link>{" "}
              to load your private tracker.
            </p>
          ) : null}
        </div>

        {user || !configured ? (
          <TrackerBoard initial={applications} configured={configured} />
        ) : (
          <div className="rounded-2xl border border-[var(--line)] bg-white/60 p-6 text-sm text-ink-soft">
            Sign in required for private application history.
          </div>
        )}
      </main>
    </div>
  );
}
