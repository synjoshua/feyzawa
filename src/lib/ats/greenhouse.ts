import type { CompanyAllowlistEntry, FetchCompanyResult, RawAtsJob } from "./types";
import { fetchWithRetry } from "./rate-limit";
import { stripHtml } from "./text";

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at?: string;
  first_published?: string;
  location?: { name?: string };
  content?: string;
}

interface GreenhouseResponse {
  jobs?: GreenhouseJob[];
}

export async function fetchGreenhouseJobs(
  company: CompanyAllowlistEntry,
): Promise<FetchCompanyResult> {
  const fetchedAt = new Date().toISOString();
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(company.boardToken)}/jobs?content=true`;

  try {
    const res = await fetchWithRetry(url);
    if (!res.ok) {
      return {
        company,
        ok: false,
        jobs: [],
        error: `Greenhouse HTTP ${res.status} for board "${company.boardToken}"`,
        statusCode: res.status,
        fetchedAt,
      };
    }

    const data = (await res.json()) as GreenhouseResponse;
    const jobs: RawAtsJob[] = (data.jobs ?? []).map((job) => {
      const html = job.content ?? "";
      return {
        provider: "greenhouse",
        boardToken: company.boardToken,
        companyName: company.name,
        sourceId: String(job.id),
        title: job.title,
        applyUrl: job.absolute_url,
        absoluteUrl: job.absolute_url,
        locationText: job.location?.name ?? "",
        descriptionHtml: html,
        descriptionText: stripHtml(html),
        postedAt: job.first_published ?? null,
        updatedAt: job.updated_at ?? null,
        raw: job,
      };
    });

    return { company, ok: true, jobs, statusCode: res.status, fetchedAt };
  } catch (err) {
    return {
      company,
      ok: false,
      jobs: [],
      error: err instanceof Error ? err.message : "Greenhouse fetch failed",
      fetchedAt,
    };
  }
}
