"use client";

import {
  createLocalApplication,
  createLocalOutreach,
  deleteLocalApplication,
  deleteLocalOutreach,
  listLocalApplications,
  listLocalOutreach,
  updateLocalApplication,
  updateLocalOutreach,
} from "./local-store";
import type {
  ApplicationRecord,
  ApplicationStatus,
  OutreachRecord,
  OutreachStatus,
} from "./types";

function mapApp(row: Record<string, unknown>): ApplicationRecord {
  return {
    id: String(row.id),
    job_id: (row.job_id as string) ?? null,
    title_snapshot: String(row.title_snapshot ?? ""),
    company_snapshot: String(row.company_snapshot ?? ""),
    apply_url: (row.apply_url as string) ?? null,
    location_snapshot: (row.location_snapshot as string) ?? null,
    status: row.status as ApplicationStatus,
    notes: String(row.notes ?? ""),
    applied_at: (row.applied_at as string) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    source: "supabase",
  };
}

function mapOut(row: Record<string, unknown>): OutreachRecord {
  return {
    id: String(row.id),
    company_name: String(row.company_name ?? ""),
    recruiter_id: (row.recruiter_id as string) ?? null,
    recruiter_name: String(row.recruiter_name ?? ""),
    linkedin_url: String(row.linkedin_url ?? ""),
    role_title: String(row.role_title ?? ""),
    job_id: (row.job_id as string) ?? null,
    status: row.status as OutreachStatus,
    draft_message: String(row.draft_message ?? ""),
    notes: String(row.notes ?? ""),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    source: "supabase",
  };
}

function appDedupeKey(row: ApplicationRecord): string {
  if (row.job_id) return `job:${row.job_id}`;
  const boardNote = row.notes?.match(/board_job_id:([^\s]+)/)?.[1];
  if (boardNote) return `job:${boardNote}`;
  return `snap:${row.company_snapshot.trim().toLowerCase()}|${row.title_snapshot.trim().toLowerCase()}`;
}

/** Merge remote + local so mark-applied never disappears from the tracker. */
function mergeApplications(
  remote: ApplicationRecord[],
  local: ApplicationRecord[],
): ApplicationRecord[] {
  const best = new Map<string, ApplicationRecord>();

  for (const row of [...local, ...remote]) {
    const key = appDedupeKey(row);
    const prev = best.get(key);
    if (!prev) {
      best.set(key, row);
      continue;
    }
    const preferRemote =
      row.source === "supabase" && prev.source !== "supabase";
    const newer =
      Date.parse(row.updated_at || "") >= Date.parse(prev.updated_at || "");
    if (preferRemote || (!prev.source?.includes("supabase") && newer) || newer) {
      // Prefer row that still has a real job_id for board matching
      best.set(
        key,
        row.job_id || !prev.job_id
          ? { ...prev, ...row, job_id: row.job_id ?? prev.job_id }
          : { ...row, ...prev, status: row.status, notes: row.notes },
      );
    }
  }

  return Array.from(best.values()).sort(
    (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at) || 0,
  );
}

export async function fetchApplications(): Promise<{
  applications: ApplicationRecord[];
  mode: "supabase" | "local";
}> {
  const local = listLocalApplications();
  try {
    const res = await fetch("/api/applications");
    if (res.ok) {
      const data = await res.json();
      const remote = (data.applications ?? []).map(
        (r: Record<string, unknown>) => mapApp(r),
      );
      return {
        applications: mergeApplications(remote, local),
        mode: "supabase",
      };
    }
  } catch {
    // fall through
  }
  return { applications: local, mode: "local" };
}

export async function trackApplication(input: {
  jobId?: string | null;
  title: string;
  company: string;
  applyUrl?: string | null;
  location?: string | null;
  status?: ApplicationStatus;
  notes?: string;
}): Promise<{ application: ApplicationRecord; mode: "supabase" | "local" }> {
  // Always mirror locally so the tracker shows the mark even if Supabase insert fails
  // (e.g. legacy job_id FK) or the user is signed out.
  const local = createLocalApplication(input);

  try {
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: input.jobId,
        title: input.title,
        company: input.company,
        applyUrl: input.applyUrl,
        location: input.location,
        status: input.status ?? "saved",
        notes: input.notes ?? "",
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const remote = mapApp(data.application);
      // Keep local row in sync with remote id/status when possible
      if (input.jobId) {
        createLocalApplication({
          ...input,
          status: remote.status,
          notes: remote.notes,
        });
      }
      return { application: remote, mode: "supabase" };
    }
  } catch {
    // fall through
  }
  return {
    application: local,
    mode: "local",
  };
}

export async function patchApplication(
  id: string,
  patch: Partial<{ status: ApplicationStatus; notes: string; applyUrl: string }>,
): Promise<{ application: ApplicationRecord; mode: "supabase" | "local" } | null> {
  // Prefer local update so UI/tracker stay consistent even when PATCH 401s
  // (local ids) or network fails.
  const local = updateLocalApplication(id, patch);

  try {
    const res = await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (res.ok) {
      const data = await res.json();
      const remote = mapApp(data.application);
      if (remote.job_id) {
        createLocalApplication({
          jobId: remote.job_id,
          title: remote.title_snapshot,
          company: remote.company_snapshot,
          applyUrl: remote.apply_url,
          location: remote.location_snapshot,
          status: remote.status,
          notes: remote.notes,
        });
      }
      return { application: remote, mode: "supabase" };
    }
  } catch {
    // fall through
  }
  return local ? { application: local, mode: "local" } : null;
}

export async function removeApplication(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/applications?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) return true;
  } catch {
    // fall through
  }
  return deleteLocalApplication(id);
}

export async function fetchOutreach(): Promise<{
  outreach: OutreachRecord[];
  mode: "supabase" | "local";
}> {
  try {
    const res = await fetch("/api/outreach");
    if (res.ok) {
      const data = await res.json();
      return {
        outreach: (data.outreach ?? []).map((r: Record<string, unknown>) =>
          mapOut(r),
        ),
        mode: "supabase",
      };
    }
  } catch {
    // fall through
  }
  return { outreach: listLocalOutreach(), mode: "local" };
}

export async function queueOutreach(input: {
  companyName: string;
  recruiterId?: string | null;
  recruiterName: string;
  linkedinUrl: string;
  roleTitle: string;
  jobId?: string | null;
  status?: OutreachStatus;
  draftMessage?: string;
  notes?: string;
}): Promise<{ item: OutreachRecord; mode: "supabase" | "local" }> {
  try {
    const res = await fetch("/api/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.ok) {
      const data = await res.json();
      return { item: mapOut(data.item), mode: "supabase" };
    }
  } catch {
    // fall through
  }
  return { item: createLocalOutreach(input), mode: "local" };
}

export async function patchOutreach(
  id: string,
  patch: Partial<{
    status: OutreachStatus;
    draftMessage: string;
    notes: string;
    linkedinUrl: string;
  }>,
): Promise<{ item: OutreachRecord; mode: "supabase" | "local" } | null> {
  try {
    const res = await fetch("/api/outreach", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (res.ok) {
      const data = await res.json();
      return { item: mapOut(data.item), mode: "supabase" };
    }
  } catch {
    // fall through
  }
  const local = updateLocalOutreach(id, patch);
  return local ? { item: local, mode: "local" } : null;
}

export async function removeOutreach(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/outreach?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) return true;
  } catch {
    // fall through
  }
  return deleteLocalOutreach(id);
}
