import type { CompanyAllowlistEntry, FetchCompanyResult, RawAtsJob } from "./types";
import { fetchWithRetry } from "./rate-limit";
import { stripHtml } from "./text";

interface LeverJob {
  id: string;
  text: string;
  hostedUrl?: string;
  applyUrl?: string;
  createdAt?: number;
  categories?: {
    location?: string;
    commitment?: string;
    team?: string;
  };
  description?: string;
  descriptionPlain?: string;
  lists?: Array<{ text?: string; content?: string }>;
}

export async function fetchLeverJobs(
  company: CompanyAllowlistEntry,
): Promise<FetchCompanyResult> {
  const fetchedAt = new Date().toISOString();
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(company.boardToken)}?mode=json`;

  try {
    const res = await fetchWithRetry(url);
    if (!res.ok) {
      return {
        company,
        ok: false,
        jobs: [],
        error: `Lever HTTP ${res.status} for board "${company.boardToken}"`,
        statusCode: res.status,
        fetchedAt,
      };
    }

    const data = (await res.json()) as LeverJob[] | { ok?: boolean; error?: string };
    if (!Array.isArray(data)) {
      return {
        company,
        ok: false,
        jobs: [],
        error: `Lever invalid payload for board "${company.boardToken}"`,
        statusCode: res.status,
        fetchedAt,
      };
    }

    const jobs: RawAtsJob[] = data.map((job) => {
      const html =
        job.description ??
        (job.lists ?? []).map((l) => l.content ?? "").join("\n") ??
        "";
      const plain = job.descriptionPlain || stripHtml(html);
      return {
        provider: "lever",
        boardToken: company.boardToken,
        companyName: company.name,
        sourceId: job.id,
        title: job.text,
        applyUrl: job.hostedUrl || job.applyUrl || "",
        absoluteUrl: job.hostedUrl,
        locationText: job.categories?.location ?? "",
        descriptionHtml: html,
        descriptionText: plain,
        postedAt: job.createdAt
          ? new Date(job.createdAt).toISOString()
          : null,
        updatedAt: null,
        raw: job,
      };
    });

    return { company, ok: true, jobs, statusCode: res.status, fetchedAt };
  } catch (err) {
    return {
      company,
      ok: false,
      jobs: [],
      error: err instanceof Error ? err.message : "Lever fetch failed",
      fetchedAt,
    };
  }
}
