import { promises as fs } from "fs";
import path from "path";
import type { NormalizedJob, RefreshSummary } from "@/lib/ats/types";
import { isSupabaseConfigured, createServiceClient } from "@/lib/supabase/admin";

export interface JobsCacheFile {
  version: 1;
  updatedAt: string;
  summary: RefreshSummary | null;
  jobs: NormalizedJob[];
}

const CACHE_PATH = path.join(process.cwd(), "data", "jobs-cache.json");

function emptyCache(): JobsCacheFile {
  return {
    version: 1,
    updatedAt: new Date(0).toISOString(),
    summary: null,
    jobs: [],
  };
}

export async function readJobsFromFile(): Promise<JobsCacheFile> {
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf8");
    return JSON.parse(raw) as JobsCacheFile;
  } catch {
    return emptyCache();
  }
}

export async function writeJobsToFile(
  jobs: NormalizedJob[],
  summary: RefreshSummary | null,
): Promise<void> {
  const payload: JobsCacheFile = {
    version: 1,
    updatedAt: new Date().toISOString(),
    summary,
    jobs,
  };
  await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await fs.writeFile(CACHE_PATH, JSON.stringify(payload, null, 2), "utf8");
}

function rowToJob(row: Record<string, unknown>): NormalizedJob {
  return {
    id: String(row.id),
    companyName: String(row.company_name),
    provider: row.provider as NormalizedJob["provider"],
    boardToken: String(row.board_token),
    sourceId: String(row.source_id),
    title: String(row.title),
    applyUrl: String(row.apply_url),
    locationText: String(row.location_text ?? ""),
    descriptionText: String(row.description_text ?? ""),
    experienceBand: row.experience_band as NormalizedJob["experienceBand"],
    workStyle: row.work_style as NormalizedJob["workStyle"],
    city: (row.city as string) ?? null,
    stateRegion: (row.state_region as string) ?? null,
    countryCode: (row.country_code as string) ?? null,
    isCalifornia: Boolean(row.is_california),
    isRemote: Boolean(row.is_remote),
    isInternship: Boolean(row.is_internship),
    isFullTime: Boolean(row.is_full_time),
    eligibility: row.eligibility as NormalizedJob["eligibility"],
    eligibilityReasons: (row.eligibility_reasons as string[]) ?? [],
    earlyCareerScore: Number(row.early_career_score ?? 0),
    postedAt: (row.posted_at as string) ?? null,
    firstSeenAt: String(row.first_seen_at),
    lastSeenAt: String(row.last_seen_at),
    lastVerifiedAt: String(row.last_verified_at),
    status: row.status as NormalizedJob["status"],
    titleMatched: true,
  };
}

function jobToRow(job: NormalizedJob) {
  return {
    id: job.id,
    company_name: job.companyName,
    provider: job.provider,
    board_token: job.boardToken,
    source_id: job.sourceId,
    title: job.title,
    apply_url: job.applyUrl,
    location_text: job.locationText,
    description_text: job.descriptionText,
    experience_band: job.experienceBand,
    work_style: job.workStyle,
    city: job.city,
    state_region: job.stateRegion,
    country_code: job.countryCode,
    is_california: job.isCalifornia,
    is_remote: job.isRemote,
    is_internship: job.isInternship,
    is_full_time: job.isFullTime,
    eligibility: job.eligibility,
    eligibility_reasons: job.eligibilityReasons,
    early_career_score: job.earlyCareerScore,
    posted_at: job.postedAt,
    first_seen_at: job.firstSeenAt,
    last_seen_at: job.lastSeenAt,
    last_verified_at: job.lastVerifiedAt,
    status: job.status,
    updated_at: new Date().toISOString(),
  };
}

export async function readJobsFromSupabase(): Promise<NormalizedJob[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("jobs").select("*");
  if (error) {
    console.error("[jobs] supabase read failed", error.message);
    return [];
  }
  return (data ?? []).map((row) => rowToJob(row as Record<string, unknown>));
}

export async function upsertJobsToSupabase(
  jobs: NormalizedJob[],
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const rows = jobs.map(jobToRow);
  // Batch upsert to avoid payload limits
  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("jobs").upsert(chunk, {
      onConflict: "id",
    });
    if (error) {
      return { ok: false, error: error.message };
    }
  }
  return { ok: true };
}

export async function loadJobs(): Promise<{
  jobs: NormalizedJob[];
  source: "supabase" | "file" | "empty";
  updatedAt: string | null;
  summary: RefreshSummary | null;
}> {
  if (isSupabaseConfigured()) {
    const jobs = await readJobsFromSupabase();
    if (jobs.length > 0) {
      const updatedAt = jobs.reduce(
        (max, j) => (j.lastVerifiedAt > max ? j.lastVerifiedAt : max),
        jobs[0].lastVerifiedAt,
      );
      return { jobs, source: "supabase", updatedAt, summary: null };
    }
  }

  const file = await readJobsFromFile();
  if (file.jobs.length > 0) {
    return {
      jobs: file.jobs,
      source: "file",
      updatedAt: file.updatedAt,
      summary: file.summary,
    };
  }

  return { jobs: [], source: "empty", updatedAt: null, summary: null };
}

export async function persistJobs(
  jobs: NormalizedJob[],
  summary: RefreshSummary,
): Promise<{ file: boolean; supabase: boolean; supabaseError?: string }> {
  let fileOk = false;
  try {
    await writeJobsToFile(jobs, summary);
    fileOk = true;
  } catch (err) {
    console.error("[jobs] file write failed", err);
  }

  let supabaseOk = false;
  let supabaseError: string | undefined;
  if (isSupabaseConfigured()) {
    const result = await upsertJobsToSupabase(jobs);
    supabaseOk = result.ok;
    supabaseError = result.error;
  }

  return { file: fileOk, supabase: supabaseOk, supabaseError };
}

export async function getJobById(id: string): Promise<NormalizedJob | null> {
  const { jobs } = await loadJobs();
  return jobs.find((j) => j.id === id) ?? null;
}
