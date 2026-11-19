import { NextResponse } from "next/server";
import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const STATUSES = new Set([
  "queued",
  "drafted",
  "sent",
  "connected",
  "replied",
  "closed",
]);

export async function GET() {
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

  const { data, error } = await supabase
    .from("outreach")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ outreach: data ?? [] });
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
  const status = String(body.status ?? "queued");
  if (!STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const row = {
    user_id: user.id,
    company_name: String(body.companyName ?? ""),
    recruiter_id: body.recruiterId ?? null,
    recruiter_name: String(body.recruiterName ?? ""),
    linkedin_url: String(body.linkedinUrl ?? ""),
    role_title: String(body.roleTitle ?? ""),
    job_id: body.jobId ?? null,
    status,
    draft_message: String(body.draftMessage ?? ""),
    notes: String(body.notes ?? ""),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("outreach")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}

export async function PATCH(request: Request) {
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
  const id = body.id as string | undefined;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.status) {
    if (!STATUSES.has(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = body.status;
  }
  if (typeof body.draftMessage === "string")
    updates.draft_message = body.draftMessage;
  if (typeof body.notes === "string") updates.notes = body.notes;
  if (typeof body.linkedinUrl === "string")
    updates.linkedin_url = body.linkedinUrl;

  const { data, error } = await supabase
    .from("outreach")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
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
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("outreach")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
