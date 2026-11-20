import { createServiceClient } from "@/lib/supabase/admin";
import type { NormalizedJob } from "@/lib/ats/types";
import { resolveAppJobId } from "./app-utils";
import {
  listLocalApplications,
  deleteLocalApplication,
} from "./local-store";
import type { ApplicationRecord } from "./types";

const SOFT = new Set(["saved", "not_interested"]);

export function closedJobIdSet(jobs: NormalizedJob[]): Set<string> {
  return new Set(
    jobs.filter((j) => j.status === "potentially_closed").map((j) => j.id),
  );
}

export function isSoftMark(app: ApplicationRecord): boolean {
  return SOFT.has(app.status);
}

/** Drop Saved / Not interested rows that point at closed listings. */
export function filterOpenSoftApps(
  applications: ApplicationRecord[],
  closedIds: Set<string>,
): ApplicationRecord[] {
  if (closedIds.size === 0) return applications;
  return applications.filter((app) => {
    if (!isSoftMark(app)) return true;
    const jobId = resolveAppJobId(app);
    if (!jobId) return true;
    return !closedIds.has(jobId);
  });
}

/** Browser localStorage cleanup for closed soft marks. */
export function purgeLocalSoftMarksForClosedJobs(closedIds: Set<string>): number {
  if (typeof window === "undefined" || closedIds.size === 0) return 0;
  let removed = 0;
  for (const row of listLocalApplications()) {
    if (!isSoftMark(row)) continue;
    const jobId = resolveAppJobId(row);
    if (jobId && closedIds.has(jobId)) {
      if (deleteLocalApplication(row.id)) removed += 1;
    }
  }
  return removed;
}

/**
 * After a refresh, clear Saved / Not interested for listings that are no longer
 * accepting apps. Keeps Applied / Interviewing / Offer / Rejected for history.
 */
export async function purgeSoftMarksForClosedJobs(
  closedJobIds: string[],
): Promise<{ deleted: number }> {
  if (closedJobIds.length === 0) return { deleted: 0 };

  const supabase = createServiceClient();
  if (!supabase) return { deleted: 0 };

  const closed = new Set(closedJobIds);
  const { data, error } = await supabase
    .from("applications")
    .select("id, job_id, notes, status")
    .in("status", ["saved", "not_interested"]);

  if (error) {
    console.error("[purge-closed]", error.message);
    return { deleted: 0 };
  }

  const toDelete = (data ?? []).filter((row) => {
    if (row.job_id && closed.has(String(row.job_id))) return true;
    const fromNotes = String(row.notes ?? "").match(
      /board_job_id:([^\s]+)/,
    )?.[1];
    return Boolean(fromNotes && closed.has(fromNotes));
  });

  if (toDelete.length === 0) return { deleted: 0 };

  const ids = toDelete.map((r) => String(r.id));
  const chunkSize = 100;
  let deleted = 0;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { error: delErr } = await supabase
      .from("applications")
      .delete()
      .in("id", chunk);
    if (delErr) {
      console.error("[purge-closed] delete", delErr.message);
      continue;
    }
    deleted += chunk.length;
  }

  return { deleted };
}

export async function purgeSoftMarksAfterRefresh(
  jobs: NormalizedJob[],
): Promise<{ deleted: number; closedCount: number }> {
  const closedIds = jobs
    .filter((j) => j.status === "potentially_closed")
    .map((j) => j.id);
  const { deleted } = await purgeSoftMarksForClosedJobs(closedIds);
  return { deleted, closedCount: closedIds.length };
}
