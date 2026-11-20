"use client";

import {
  createLocalApplication,
  createLocalOutreach,
  deleteLocalApplication,
  deleteLocalOutreach,
  listLocalApplications,
  listLocalOutreach,
  replaceLocalApplication,
  updateLocalApplication,
  updateLocalOutreach,
} from "./local-store";
import {
  appDedupeKey,
  resolveAppJobId,
  withBoardJobNote,
} from "./app-utils";
import type {
  ApplicationRecord,
  ApplicationStatus,
  OutreachRecord,
  OutreachStatus,
} from "./types";

export { resolveAppJobId, withBoardJobNote } from "./app-utils";

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

const PIPELINE_RANK: Record<string, number> = {
  offer: 5,
  interviewing: 4,
  applied: 3,
  rejected: 2,
  saved: 1,
  not_interested: 1,
};

function pickBetterApp(
  a: ApplicationRecord,
  b: ApplicationRecord,
): ApplicationRecord {
  const rankA = PIPELINE_RANK[a.status] ?? 0;
  const rankB = PIPELINE_RANK[b.status] ?? 0;
  if (rankA !== rankB) return rankA > rankB ? a : b;
  const newer =
    Date.parse(a.updated_at || "") >= Date.parse(b.updated_at || "") ? a : b;
  const other = newer === a ? b : a;
  return {
    ...other,
    ...newer,
    job_id: newer.job_id ?? other.job_id,
    status: newer.status,
    notes: newer.notes || other.notes,
  };
}

function mergeApplications(
  remote: ApplicationRecord[],
  local: ApplicationRecord[],
): ApplicationRecord[] {
  const best = new Map<string, ApplicationRecord>();
  for (const row of [...local, ...remote]) {
    const key = appDedupeKey(row);
    const prev = best.get(key);
    best.set(key, prev ? pickBetterApp(prev, row) : row);
  }
  return Array.from(best.values()).sort(
    (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at) || 0,
  );
}

async function postApplication(body: Record<string, unknown>) {
  return fetch("/api/applications", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Push browser-only rows up to Supabase once the user is signed in. */
async function syncLocalToCloud(
  remote: ApplicationRecord[],
): Promise<ApplicationRecord[]> {
  const remoteKeys = new Set(remote.map(appDedupeKey));
  const local = listLocalApplications();
  const uploaded: ApplicationRecord[] = [];

  for (const row of local) {
    const key = appDedupeKey(row);
    if (remoteKeys.has(key)) continue;

    const jobId = resolveAppJobId(row);
    try {
      let res = await postApplication({
        jobId,
        title: row.title_snapshot,
        company: row.company_snapshot,
        applyUrl: row.apply_url,
        location: row.location_snapshot,
        status: row.status,
        notes: withBoardJobNote(row.notes, jobId),
      });

      // If FK still blocks job_id, retry with notes-only linkage
      if (!res.ok && jobId) {
        res = await postApplication({
          jobId: null,
          title: row.title_snapshot,
          company: row.company_snapshot,
          applyUrl: row.apply_url,
          location: row.location_snapshot,
          status: row.status,
          notes: withBoardJobNote(row.notes, jobId),
        });
      }

      if (res.ok) {
        const data = await res.json();
        uploaded.push(mapApp(data.application));
        remoteKeys.add(key);
      }
    } catch {
      // keep local-only until next load
    }
  }

  return uploaded;
}

export async function fetchApplications(): Promise<{
  applications: ApplicationRecord[];
  mode: "supabase" | "local";
}> {
  const local = listLocalApplications();
  try {
    const res = await fetch("/api/applications", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      const remote = (data.applications ?? []).map(
        (r: Record<string, unknown>) => mapApp(r),
      );
      // Don't block the UI on sequential local→cloud uploads
      void syncLocalToCloud(remote);
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
  const notes = withBoardJobNote(input.notes, input.jobId);
  const local = createLocalApplication({ ...input, notes });

  const body = {
    jobId: input.jobId ?? null,
    title: input.title,
    company: input.company,
    applyUrl: input.applyUrl ?? null,
    location: input.location ?? null,
    status: input.status ?? "saved",
    notes,
  };

  // Cloud upsert in the background — UI already has the local row
  void (async () => {
    try {
      let res = await postApplication(body);
      if (!res.ok && input.jobId) {
        res = await postApplication({ ...body, jobId: null });
      }
      if (res.ok) {
        const data = await res.json();
        replaceLocalApplication(local.id, mapApp(data.application));
      }
    } catch {
      // keep local-only until next sync
    }
  })();

  return { application: local, mode: "local" };
}

export async function patchApplication(
  id: string,
  patch: Partial<{ status: ApplicationStatus; notes: string; applyUrl: string }>,
): Promise<{ application: ApplicationRecord; mode: "supabase" | "local" } | null> {
  const local = updateLocalApplication(id, patch);

  try {
    const res = await fetch("/api/applications", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (res.ok) {
      const data = await res.json();
      const remote = mapApp(data.application);
      createLocalApplication({
        jobId: resolveAppJobId(remote),
        title: remote.title_snapshot,
        company: remote.company_snapshot,
        applyUrl: remote.apply_url,
        location: remote.location_snapshot,
        status: remote.status,
        notes: remote.notes,
      });
      return { application: remote, mode: "supabase" };
    }

    // Local UUID won't patch on Supabase — upsert by job instead
    if (local && (res.status === 400 || res.status === 404 || res.status === 500)) {
      const jobId = resolveAppJobId(local);
      const upsert = await postApplication({
        jobId,
        title: local.title_snapshot,
        company: local.company_snapshot,
        applyUrl: local.apply_url,
        location: local.location_snapshot,
        status: patch.status ?? local.status,
        notes: withBoardJobNote(patch.notes ?? local.notes, jobId),
      });
      if (upsert.ok) {
        const data = await upsert.json();
        return { application: mapApp(data.application), mode: "supabase" };
      }
    }
  } catch {
    // fall through
  }
  return local ? { application: local, mode: "local" } : null;
}

export async function removeApplication(
  id: string,
  jobId?: string | null,
): Promise<boolean> {
  let remoteOk = false;
  try {
    const res = await fetch(`/api/applications?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    remoteOk = res.ok;
  } catch {
    // fall through
  }

  let localCleared = false;
  const local = listLocalApplications();
  for (const row of local) {
    if ((id && row.id === id) || (jobId && row.job_id === jobId)) {
      deleteLocalApplication(row.id);
      localCleared = true;
    }
  }

  return remoteOk || localCleared;
}

export async function fetchOutreach(): Promise<{
  outreach: OutreachRecord[];
  mode: "supabase" | "local";
}> {
  try {
    const res = await fetch("/api/outreach", {
      credentials: "same-origin",
      cache: "no-store",
    });
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
      credentials: "same-origin",
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
      credentials: "same-origin",
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
      credentials: "same-origin",
    });
    if (res.ok) return true;
  } catch {
    // fall through
  }
  return deleteLocalOutreach(id);
}
