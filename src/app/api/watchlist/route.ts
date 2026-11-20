import { NextResponse } from "next/server";
import { getEffectiveAllowlist } from "@/lib/ats/discover";
import { refreshCompanyJobs } from "@/lib/ats/fetch-all";
import { loadJobs, persistJobs } from "@/lib/jobs/store";
import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";
import { loadUserWatchlist } from "@/lib/watchlist/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { items, source } = await loadUserWatchlist(user.id);
  return NextResponse.json({ watchlist: items, source });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const body = await request.json();
  const companyName = String(body.companyName ?? "").trim();
  if (!companyName) {
    return NextResponse.json({ error: "companyName required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("watchlist")
    .upsert(
      {
        user_id: user.id,
        company_name: companyName,
        provider: body.provider ?? null,
        board_token: body.boardToken ?? null,
      },
      { onConflict: "user_id,company_name" },
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Pull this company's board now so Company watch isn't stuck at 0 until cron.
  let fetchResult: {
    ok: boolean;
    designJobsMatched?: number;
    error?: string;
  } = { ok: false };
  try {
    const allowlist = await getEffectiveAllowlist();
    const boardToken = body.boardToken ? String(body.boardToken) : null;
    const provider = body.provider ? String(body.provider) : null;
    const company =
      allowlist.find(
        (c) =>
          c.name.toLowerCase() === companyName.toLowerCase() &&
          (!provider || c.provider === provider) &&
          (!boardToken || c.boardToken === boardToken),
      ) ??
      allowlist.find(
        (c) => c.name.toLowerCase() === companyName.toLowerCase(),
      );

    if (company) {
      const existing = await loadJobs();
      const { jobs, summary } = await refreshCompanyJobs(
        company,
        existing.jobs,
      );
      await persistJobs(jobs, summary);
      fetchResult = {
        ok: true,
        designJobsMatched: summary.designJobsMatched,
      };
    } else {
      fetchResult = {
        ok: false,
        error: "Company is not on the allowlist yet — roles appear after discovery or a full refresh.",
      };
    }
  } catch (err) {
    fetchResult = {
      ok: false,
      error: err instanceof Error ? err.message : "Board fetch failed",
    };
  }

  return NextResponse.json({ item: data, fetch: fetchResult });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const company = searchParams.get("company");
  if (!id && !company) {
    return NextResponse.json({ error: "Missing id or company" }, { status: 400 });
  }

  const clearAll = searchParams.get("all") === "1";

  let query = supabase.from("watchlist").delete().eq("user_id", user.id);
  if (clearAll) {
    // wipe every row for this user
  } else if (id) {
    query = query.eq("id", id);
  } else if (company) {
    query = query.eq("company_name", company);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
