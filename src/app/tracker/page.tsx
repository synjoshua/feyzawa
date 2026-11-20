import { PageShell } from "@/components/PageShell";
import { TrackerBoard } from "@/components/TrackerBoard";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseAuthConfigured } from "@/lib/supabase/admin";
import { loadUserApplications } from "@/lib/tracking/load-user-apps";

export const dynamic = "force-dynamic";

export default async function TrackerPage() {
  const configured = isSupabaseAuthConfigured();
  const user = await getCurrentUser();
  const applications = await loadUserApplications(user?.id);

  return (
    <PageShell
      active="/tracker"
      signedIn={Boolean(user)}
      eyebrow="Private"
      title="Tracker"
      description="Mark roles you saved or already applied to. Add manual entries for anything off-board. Notes stay private."
    >
      <TrackerBoard initial={applications} configured={configured} />
    </PageShell>
  );
}
