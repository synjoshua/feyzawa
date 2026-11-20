import type {
  ApplicationRecord,
  ApplicationStatus,
  OutreachRecord,
  OutreachStatus,
} from "./types";

const APP_KEY = "feyzawa.applications.v1";
const OUT_KEY = "feyzawa.outreach.v1";

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function listLocalApplications(): ApplicationRecord[] {
  return readJson<ApplicationRecord[]>(APP_KEY, []).map((a) => ({
    ...a,
    source: "local" as const,
  }));
}

export function createLocalApplication(input: {
  jobId?: string | null;
  title: string;
  company: string;
  applyUrl?: string | null;
  location?: string | null;
  status?: ApplicationStatus;
  notes?: string;
}): ApplicationRecord {
  const now = new Date().toISOString();
  const status = input.status ?? "saved";
  let notes = (input.notes ?? "").trim();
  if (input.jobId && !notes.includes(`board_job_id:${input.jobId}`)) {
    notes = [notes, `board_job_id:${input.jobId}`].filter(Boolean).join("\n");
  }
  const row: ApplicationRecord = {
    id: uid(),
    job_id: input.jobId ?? null,
    title_snapshot: input.title,
    company_snapshot: input.company,
    apply_url: input.applyUrl ?? null,
    location_snapshot: input.location ?? null,
    status,
    notes,
    applied_at: status === "applied" ? now : null,
    created_at: now,
    updated_at: now,
    source: "local",
  };
  const all = listLocalApplications();
  const PIPELINE = new Set([
    "applied",
    "interviewing",
    "offer",
    "rejected",
  ]);
  // If same job_id already tracked, update instead of duplicate
  if (row.job_id) {
    const idx = all.findIndex(
      (a) =>
        a.job_id === row.job_id ||
        (a.notes ?? "").includes(`board_job_id:${row.job_id}`),
    );
    if (idx >= 0) {
      const prev = all[idx];
      // Don't let bookmark (saved) downgrade applied / pipeline status
      if (status === "saved" && PIPELINE.has(prev.status)) {
        return { ...prev, source: "local" as const };
      }
      const merged = {
        ...prev,
        ...row,
        id: prev.id,
        job_id: prev.job_id ?? row.job_id,
        created_at: prev.created_at,
        source: "local" as const,
      };
      all[idx] = merged;
      writeJson(APP_KEY, all);
      return merged;
    }
  }
  all.unshift(row);
  writeJson(APP_KEY, all);
  return row;
}

export function updateLocalApplication(
  id: string,
  patch: Partial<{
    status: ApplicationStatus;
    notes: string;
    applyUrl: string;
  }>,
): ApplicationRecord | null {
  const all = listLocalApplications();
  const idx = all.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  const now = new Date().toISOString();
  const prev = all[idx];
  const next: ApplicationRecord = {
    ...prev,
    status: patch.status ?? prev.status,
    notes: patch.notes ?? prev.notes,
    apply_url: patch.applyUrl ?? prev.apply_url,
    updated_at: now,
    applied_at:
      patch.status === "applied" && !prev.applied_at
        ? now
        : prev.applied_at,
    source: "local",
  };
  all[idx] = next;
  writeJson(APP_KEY, all);
  return next;
}

export function deleteLocalApplication(id: string): boolean {
  const all = listLocalApplications();
  const next = all.filter((a) => a.id !== id);
  if (next.length === all.length) return false;
  writeJson(APP_KEY, next);
  return true;
}

export function listLocalOutreach(): OutreachRecord[] {
  return readJson<OutreachRecord[]>(OUT_KEY, []).map((o) => ({
    ...o,
    source: "local" as const,
  }));
}

export function createLocalOutreach(input: {
  companyName: string;
  recruiterId?: string | null;
  recruiterName: string;
  linkedinUrl: string;
  roleTitle: string;
  jobId?: string | null;
  status?: OutreachStatus;
  draftMessage?: string;
  notes?: string;
}): OutreachRecord {
  const now = new Date().toISOString();
  const row: OutreachRecord = {
    id: uid(),
    company_name: input.companyName,
    recruiter_id: input.recruiterId ?? null,
    recruiter_name: input.recruiterName,
    linkedin_url: input.linkedinUrl,
    role_title: input.roleTitle,
    job_id: input.jobId ?? null,
    status: input.status ?? "queued",
    draft_message: input.draftMessage ?? "",
    notes: input.notes ?? "",
    created_at: now,
    updated_at: now,
    source: "local",
  };
  const all = listLocalOutreach();
  all.unshift(row);
  writeJson(OUT_KEY, all);
  return row;
}

export function updateLocalOutreach(
  id: string,
  patch: Partial<{
    status: OutreachStatus;
    draftMessage: string;
    notes: string;
    linkedinUrl: string;
  }>,
): OutreachRecord | null {
  const all = listLocalOutreach();
  const idx = all.findIndex((o) => o.id === id);
  if (idx < 0) return null;
  const prev = all[idx];
  const next: OutreachRecord = {
    ...prev,
    status: patch.status ?? prev.status,
    draft_message: patch.draftMessage ?? prev.draft_message,
    notes: patch.notes ?? prev.notes,
    linkedin_url: patch.linkedinUrl ?? prev.linkedin_url,
    updated_at: new Date().toISOString(),
    source: "local",
  };
  all[idx] = next;
  writeJson(OUT_KEY, all);
  return next;
}

export function deleteLocalOutreach(id: string): boolean {
  const all = listLocalOutreach();
  const next = all.filter((o) => o.id !== id);
  if (next.length === all.length) return false;
  writeJson(OUT_KEY, next);
  return true;
}
