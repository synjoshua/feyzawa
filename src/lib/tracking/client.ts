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

export async function fetchApplications(): Promise<{
  applications: ApplicationRecord[];
  mode: "supabase" | "local";
}> {
  try {
    const res = await fetch("/api/applications");
    if (res.ok) {
      const data = await res.json();
      return {
        applications: (data.applications ?? []).map(
          (r: Record<string, unknown>) => mapApp(r),
        ),
        mode: "supabase",
      };
    }
  } catch {
    // fall through
  }
  return { applications: listLocalApplications(), mode: "local" };
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
      return { application: mapApp(data.application), mode: "supabase" };
    }
  } catch {
    // fall through
  }
  return {
    application: createLocalApplication(input),
    mode: "local",
  };
}

export async function patchApplication(
  id: string,
  patch: Partial<{ status: ApplicationStatus; notes: string; applyUrl: string }>,
): Promise<{ application: ApplicationRecord; mode: "supabase" | "local" } | null> {
  try {
    const res = await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (res.ok) {
      const data = await res.json();
      return { application: mapApp(data.application), mode: "supabase" };
    }
  } catch {
    // fall through
  }
  const local = updateLocalApplication(id, patch);
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
