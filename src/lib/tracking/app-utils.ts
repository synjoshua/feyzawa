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
  return matchApplicationToJobIds(app, jobs)[0] ?? null;
}

/**
 * ATS boards (esp. Lever) often list the same title multiple times with
 * different source IDs. Soft marks should hide / status every sibling.
 */
export function matchApplicationToJobIds(
  app: ApplicationRecord,
  jobs: NormalizedJob[],
): string[] {
  const company = app.company_snapshot.trim().toLowerCase();
  const title = app.title_snapshot.trim().toLowerCase();
  const bySnap = jobs
    .filter(
      (j) =>
        j.companyName.toLowerCase() === company &&
        j.title.toLowerCase() === title,
    )
    .map((j) => j.id);
  if (bySnap.length > 0) return Array.from(new Set(bySnap));

  const fromId = resolveAppJobId(app);
  return fromId ? [fromId] : [];
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
    const jobKeys = matchApplicationToJobIds(a, jobs);
    for (const jobKey of jobKeys) {
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
  }
  return next;
}
