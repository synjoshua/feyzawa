import { NextResponse } from "next/server";
import { refreshAllJobs } from "@/lib/ats/fetch-all";
import { loadJobs, persistJobs } from "@/lib/jobs/store";
import { getCurrentUser } from "@/lib/supabase/server";
import { purgeSoftMarksAfterRefresh } from "@/lib/tracking/purge-closed";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Manual refresh from the UI.
 * - Local/dev: always allowed
 * - Production: signed-in users, or Authorization: Bearer CRON_SECRET
 *   (anonymous visitors cannot hammer ATS boards).
 */
async function authorize(request: Request): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return true;
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get("authorization");
    if (header === `Bearer ${secret}`) return true;
    const url = new URL(request.url);
    if (url.searchParams.get("secret") === secret) return true;
  }
  const user = await getCurrentUser();
  return Boolean(user);
}

export async function POST(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json(
      {
        error:
          "Sign in to refresh jobs, or use the daily cron / CRON_SECRET bearer.",
      },
      { status: 401 },
    );
  }

  try {
    const existing = await loadJobs();
    // Manual refresh also discovers a smaller batch so new boards keep landing.
    const { jobs, summary } = await refreshAllJobs(existing.jobs, {
      discover: true,
      discoverBatchSize: Number(process.env.DISCOVER_BATCH_SIZE_MANUAL ?? "12"),
    });
    const persist = await persistJobs(jobs, summary);
    const purge = await purgeSoftMarksAfterRefresh(jobs);
    const activeCount = jobs.filter((j) => j.status === "active").length;

    return NextResponse.json({
      ok: true,
      activeCount,
      totalCount: jobs.length,
      summary,
      persist,
      purge,
    });
  } catch (err) {
    console.error("[jobs/refresh]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Refresh failed",
      },
      { status: 500 },
    );
  }
}
