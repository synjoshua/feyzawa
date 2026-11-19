import { PageShell } from "@/components/PageShell";
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
    <PageShell
      active="/tracker"
      eyebrow="Private"
      title="Tracker"
      description="Mark roles you saved or already applied to. Add manual entries for anything off-board. Notes stay private."
      maxWidthClass="max-w-7xl"
    >
      <TrackerBoard initial={applications} configured={configured} />
    </PageShell>
  );
}
