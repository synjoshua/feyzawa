import type { CompanyAllowlistEntry, FetchCompanyResult, RawAtsJob } from "./types";
import { fetchWithRetry } from "./rate-limit";
import { stripHtml } from "./text";

interface AshbyJob {
  id: string;
  title: string;
  jobUrl?: string;
  applyUrl?: string;
  location?: string | { name?: string };
  secondaryLocations?: Array<string | { name?: string }>;
  publishedAt?: string;
  updatedAt?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  isRemote?: boolean;
  workplaceType?: string;
}

interface AshbyResponse {
  jobs?: AshbyJob[];
}

function locationToText(job: AshbyJob): string {
  const parts: string[] = [];
  const primary =
    typeof job.location === "string"
      ? job.location
      : job.location?.name ?? "";
  if (primary) parts.push(primary);
  for (const loc of job.secondaryLocations ?? []) {
    const text = typeof loc === "string" ? loc : loc?.name ?? "";
    if (text) parts.push(text);
  }
  if (job.isRemote || job.workplaceType?.toLowerCase().includes("remote")) {
    parts.push("Remote");
  }
  return parts.join(" · ");
}

export async function fetchAshbyJobs(
  company: CompanyAllowlistEntry,
): Promise<FetchCompanyResult> {
  const fetchedAt = new Date().toISOString();
  // includeJobDescription=true returns JD text for eligibility parsing
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(company.boardToken)}?includeJobDescription=true`;

  try {
    const res = await fetchWithRetry(url);
    if (!res.ok) {
      return {
        company,
        ok: false,
        jobs: [],
        error: `Ashby HTTP ${res.status} for board "${company.boardToken}"`,
        statusCode: res.status,
        fetchedAt,
      };
    }

    const data = (await res.json()) as AshbyResponse;
    const jobs: RawAtsJob[] = (data.jobs ?? []).map((job) => {
      const html = job.descriptionHtml ?? "";
      const plain = job.descriptionPlain || stripHtml(html);
      return {
        provider: "ashby",
        boardToken: company.boardToken,
        companyName: company.name,
        sourceId: job.id,
        title: job.title,
        applyUrl: job.jobUrl || job.applyUrl || "",
        absoluteUrl: job.jobUrl,
        locationText: locationToText(job),
        descriptionHtml: html,
        descriptionText: plain,
        postedAt: job.publishedAt ?? null,
        updatedAt: job.updatedAt ?? null,
        raw: job,
      };
    });

    return { company, ok: true, jobs, statusCode: res.status, fetchedAt };
  } catch (err) {
    return {
      company,
      ok: false,
      jobs: [],
      error: err instanceof Error ? err.message : "Ashby fetch failed",
      fetchedAt,
    };
  }
}
