import type { NormalizedJob } from "@/lib/ats/types";
import type { ApplicationRecord, ApplicationStatus } from "./types";

export function resolveAppJobId(row: ApplicationRecord): string | null {
  if (row.job_id) return row.job_id;
  return row.notes?.match(/board_job_id:([^\s]+)/)?.[1] ?? null;
}

export function appDedupeKey(row: ApplicationRecord): string {
  if (row.job_id) return `job:${row.job_id}`;
  const boardNote = row.notes?.match(/board_job_id:([^\s]+)/)?.[1];
  if (boardNote) return `job:${boardNote}`;
  return `snap:${row.company_snapshot.trim().toLowerCase()}|${row.title_snapshot.trim().toLowerCase()}`;
}

export function withBoardJobNote(
  notes: string | null | undefined,
  jobId: string | null | undefined,
): string {
  const base = (notes ?? "").trim();
  if (!jobId) return base;
  if (base.includes(`board_job_id:${jobId}`)) return base;
  return [base, `board_job_id:${jobId}`].filter(Boolean).join("\n");
}

export function matchApplicationToJobId(
  app: ApplicationRecord,
  jobs: NormalizedJob[],
): string | null {
  const fromId = resolveAppJobId(app);
  if (fromId) return fromId;
  const company = app.company_snapshot.trim().toLowerCase();
  const title = app.title_snapshot.trim().toLowerCase();
  const hit = jobs.find(
    (j) =>
      j.companyName.toLowerCase() === company &&
      j.title.toLowerCase() === title,
  );
  return hit?.id ?? null;
}

export function buildAppByJobMap(
  applications: ApplicationRecord[],
  jobs: NormalizedJob[],
): Map<string, { id: string; status: ApplicationStatus }> {
  const next = new Map<string, { id: string; status: ApplicationStatus }>();
  const pipeline = new Set([
    "applied",
    "interviewing",
    "offer",
    "rejected",
  ]);
  const soft = new Set(["saved", "not_interested"]);

  for (const a of applications) {
    const jobKey = matchApplicationToJobId(a, jobs);
    if (!jobKey) continue;
    const prev = next.get(jobKey);
    if (!prev) {
      next.set(jobKey, { id: a.id, status: a.status });
      continue;
    }
    if (pipeline.has(a.status) && soft.has(prev.status)) {
      next.set(jobKey, { id: a.id, status: a.status });
    } else if (pipeline.has(prev.status) && soft.has(a.status)) {
      // keep pipeline
    } else {
      next.set(jobKey, { id: a.id, status: a.status });
    }
  }
  return next;
}
