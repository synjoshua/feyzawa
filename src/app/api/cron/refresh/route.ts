import { NextResponse } from "next/server";
import { refreshAllJobs } from "@/lib/ats/fetch-all";
import { loadJobs, persistJobs } from "@/lib/jobs/store";

export const runtime = "nodejs";
export const maxDuration = 300;

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // In local/dev without secret, allow only when not in production
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;
  return false;
}

async function handleRefresh(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existing = await loadJobs();
    const { jobs, summary } = await refreshAllJobs(existing.jobs);
    const persist = await persistJobs(jobs, summary);

    return NextResponse.json({
      ok: true,
      summary,
      persist,
      activeCount: jobs.filter((j) => j.status === "active").length,
      totalCount: jobs.length,
    });
  } catch (err) {
    console.error("[cron/refresh]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Refresh failed",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleRefresh(request);
}

export async function POST(request: Request) {
  return handleRefresh(request);
}
