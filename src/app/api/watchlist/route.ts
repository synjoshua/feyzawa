import { NextResponse } from "next/server";
import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";
import { loadUserWatchlist } from "@/lib/watchlist/server";

export const runtime = "nodejs";

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

  return NextResponse.json({ item: data });
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
