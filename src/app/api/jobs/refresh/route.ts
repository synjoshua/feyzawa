import { NextResponse } from "next/server";
import { refreshAllJobs } from "@/lib/ats/fetch-all";
import { loadJobs, persistJobs } from "@/lib/jobs/store";
import { purgeSoftMarksAfterRefresh } from "@/lib/tracking/purge-closed";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Manual refresh from the UI.
 * - Local/dev: always allowed
 * - Production: requires Authorization: Bearer CRON_SECRET (or ?secret=)
 *   so random visitors cannot hammer ATS boards.
 */
function authorize(request: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json(
      {
        error:
          "Refresh locked in production. Set CRON_SECRET and call with Authorization bearer, or use Vercel Cron.",
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
