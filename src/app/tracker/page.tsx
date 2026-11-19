import { SiteHeader } from "@/components/SiteHeader";
import { TrackerBoard } from "@/components/TrackerBoard";
import {
  createServerSupabaseClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { isSupabaseAuthConfigured } from "@/lib/supabase/admin";
import type { ApplicationRecord } from "@/lib/tracking/types";

export const dynamic = "force-dynamic";

export default async function TrackerPage() {
  const configured = isSupabaseAuthConfigured();
  const user = await getCurrentUser();

  let applications: ApplicationRecord[] = [];
  if (configured && user) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from("applications")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      applications = (data ?? []) as ApplicationRecord[];
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader active="/tracker" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 max-w-2xl">
          <p className="eyebrow">Private</p>
          <h1 className="brand-mark mt-2 text-5xl text-ink">Tracker</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Mark roles you saved or already applied to. Add manual entries for
            anything off-board. Notes stay private.
          </p>
        </div>
        <TrackerBoard initial={applications} configured={configured} />
      </main>
    </div>
  );
}
