import { NextResponse } from "next/server";
import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const STATUSES = new Set([
  "saved",
  "not_interested",
  "applied",
  "interviewing",
  "offer",
  "rejected",
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
    .from("applications")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ applications: data ?? [] });
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
  const status = String(body.status ?? "saved");
  if (!STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const jobId =
    typeof body.jobId === "string" && body.jobId.trim()
      ? body.jobId.trim()
      : null;
  const now = new Date().toISOString();

  const PIPELINE = new Set([
    "applied",
    "interviewing",
    "offer",
    "rejected",
  ]);
  const SOFT = new Set(["saved", "not_interested"]);

  function withBoardNote(notes: string, id: string | null) {
    if (!id) return notes;
    if (notes.includes(`board_job_id:${id}`)) return notes;
    return [notes, `board_job_id:${id}`].filter(Boolean).join("\n");
  }

  const incomingNotes = withBoardNote(String(body.notes ?? ""), jobId);

  // Upsert by job: mark applied / save should update an existing row, not orphan.
  if (jobId) {
    const { data: candidates } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    const existing =
      candidates?.find((row) => row.job_id === jobId) ??
      candidates?.find((row) =>
        String(row.notes ?? "").includes(`board_job_id:${jobId}`),
      ) ??
      candidates?.find(
        (row) =>
          String(row.company_snapshot ?? "").toLowerCase() ===
            String(body.company ?? "").trim().toLowerCase() &&
          String(row.title_snapshot ?? "").toLowerCase() ===
            String(body.title ?? "").trim().toLowerCase(),
      );

    if (existing) {
      // Never let bookmark / not-interested downgrade an applied / pipeline role.
      if (SOFT.has(status) && PIPELINE.has(String(existing.status))) {
        return NextResponse.json({ application: existing });
      }

      const updates: Record<string, unknown> = {
        status,
        job_id: existing.job_id ?? jobId,
        title_snapshot: String(body.title ?? existing.title_snapshot),
        company_snapshot: String(body.company ?? existing.company_snapshot),
        apply_url: body.applyUrl ?? existing.apply_url,
        location_snapshot: body.location ?? existing.location_snapshot,
        notes: withBoardNote(
          typeof body.notes === "string"
            ? body.notes
            : String(existing.notes ?? ""),
          jobId,
        ),
        updated_at: now,
      };
      if (status === "applied" && !existing.applied_at) {
        updates.applied_at = now;
      }
      const { data, error } = await supabase
        .from("applications")
        .update(updates)
        .eq("id", existing.id)
        .eq("user_id", user.id)
        .select("*")
        .single();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ application: data });
    }
  }

  const row = {
    user_id: user.id,
    job_id: jobId,
    title_snapshot: String(body.title ?? "Untitled"),
    company_snapshot: String(body.company ?? "Unknown"),
    apply_url: body.applyUrl ?? null,
    location_snapshot: body.location ?? null,
    status,
    notes: incomingNotes,
    applied_at: status === "applied" ? now : null,
    updated_at: now,
  };

  let { data, error } = await supabase
    .from("applications")
    .insert(row)
    .select("*")
    .single();

  // Legacy DBs may still FK job_id → jobs. Retry without job_id so tracking works.
  if (error && jobId) {
    const fk =
      /foreign key|violates foreign key|jobs/i.test(error.message ?? "") ||
      error.code === "23503";
    if (fk) {
      const retry = await supabase
        .from("applications")
        .insert({ ...row, job_id: null })
        .select("*")
        .single();
      data = retry.data;
      error = retry.error;
      if (!error && data) {
        // Keep board linkage in notes when FK blocked job_id
        const note = `board_job_id:${jobId}`;
        const notes = [data.notes, note].filter(Boolean).join("\n");
        const patched = await supabase
          .from("applications")
          .update({ notes })
          .eq("id", data.id)
          .select("*")
          .single();
        if (patched.data) data = patched.data;
      }
    }
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ application: data });
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
    if (body.status === "applied" && !body.applied_at) {
      updates.applied_at = new Date().toISOString();
    }
  }
  if (typeof body.notes === "string") updates.notes = body.notes;
  if (typeof body.applyUrl === "string") updates.apply_url = body.applyUrl;

  const { data, error } = await supabase
    .from("applications")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ application: data });
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
    .from("applications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
