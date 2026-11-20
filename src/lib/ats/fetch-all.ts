import { discoverNewBoards, getEffectiveAllowlist } from "./discover";
import { fetchAshbyJobs } from "./ashby";
import { fetchGreenhouseJobs } from "./greenhouse";
import { fetchLeverJobs } from "./lever";
import { dedupeJobs, normalizeJob, sortJobs } from "./normalize";
import { ATS_FETCH_DELAY_MS, sleep } from "./rate-limit";
import type {
  CompanyAllowlistEntry,
  FetchCompanyResult,
  NormalizedJob,
  RefreshSummary,
} from "./types";

async function fetchCompany(
  company: CompanyAllowlistEntry,
): Promise<FetchCompanyResult> {
  switch (company.provider) {
    case "greenhouse":
      return fetchGreenhouseJobs(company);
    case "lever":
      return fetchLeverJobs(company);
    case "ashby":
      return fetchAshbyJobs(company);
    default:
      return {
        company,
        ok: false,
        jobs: [],
        error: `Unknown provider`,
        fetchedAt: new Date().toISOString(),
      };
  }
}

export interface RefreshResult {
  jobs: NormalizedJob[];
  summary: RefreshSummary;
}

export interface RefreshOptions {
  /** Probe unseen ATS candidates and auto-promote design-hiring boards. */
  discover?: boolean;
  /** Override discover batch size (defaults via DISCOVER_BATCH_SIZE / 30). */
  discoverBatchSize?: number;
}

/**
 * Optionally discover new boards, then fetch all allowlisted boards
 * sequentially (rate-limit friendly), normalize, filter design titles,
 * dedupe, and merge lifecycle timestamps.
 */
export async function refreshAllJobs(
  previous: NormalizedJob[] = [],
  options: RefreshOptions = {},
): Promise<RefreshResult> {
  const startedAt = new Date().toISOString();

  let discoverySummary: RefreshSummary["discovery"];
  let allowlist: CompanyAllowlistEntry[];

  if (options.discover !== false) {
    const discovered = await discoverNewBoards({
      batchSize: options.discoverBatchSize,
    });
    discoverySummary = discovered.summary;
    allowlist = discovered.allowlist;
  } else {
    allowlist = await getEffectiveAllowlist();
  }

  const previousById = new Map(previous.map((j) => [j.id, j]));

  const failures: RefreshSummary["failures"] = [];
  let companiesSucceeded = 0;
  let companiesFailed = 0;
  let rawJobsFetched = 0;
  const normalized: NormalizedJob[] = [];
  const seenIds = new Set<string>();

  for (const company of allowlist) {
    const result = await fetchCompany(company);
    if (!result.ok) {
      companiesFailed += 1;
      failures.push({
        company: company.name,
        provider: company.provider,
        error: result.error ?? "Unknown error",
      });
      // On failure, preserve previous jobs for this company (don't mark closed)
      for (const job of previous) {
        if (
          job.companyName === company.name &&
          job.provider === company.provider &&
          job.boardToken === company.boardToken
        ) {
          normalized.push(job);
          seenIds.add(job.id);
        }
      }
    } else {
      companiesSucceeded += 1;
      rawJobsFetched += result.jobs.length;
      const nowIso = new Date().toISOString();
      for (const raw of result.jobs) {
        // Provisional normalize to resolve stable id, then merge lifecycle
        const provisional = normalizeJob(raw, nowIso, null);
        if (!provisional) continue;
        const withExisting = normalizeJob(
          raw,
          nowIso,
          previousById.get(provisional.id) ?? null,
        );
        if (withExisting) {
          normalized.push(withExisting);
          seenIds.add(withExisting.id);
        }
      }
    }

    await sleep(ATS_FETCH_DELAY_MS);
  }

  // Mark previously active jobs missing from successful fetches as potentially closed
  let markedPotentiallyClosed = 0;
  const successfullyFetchedCompanies = new Set(
    allowlist
      .filter(
        (c) =>
          !failures.some(
            (f) => f.company === c.name && f.provider === c.provider,
          ),
      )
      .map((c) => `${c.provider}:${c.boardToken}`),
  );

  for (const prev of previous) {
    if (seenIds.has(prev.id)) continue;
    const key = `${prev.provider}:${prev.boardToken}`;
    if (!successfullyFetchedCompanies.has(key)) {
      // Company fetch failed — keep as-is
      if (!normalized.some((j) => j.id === prev.id)) {
        normalized.push(prev);
      }
      continue;
    }
    markedPotentiallyClosed += 1;
    normalized.push({
      ...prev,
      status: "potentially_closed",
      // Preserve application-relevant fields; do not wipe history
    });
  }

  const jobs = sortJobs(dedupeJobs(normalized));
  const finishedAt = new Date().toISOString();

  return {
    jobs,
    summary: {
      startedAt,
      finishedAt,
      companiesAttempted: allowlist.length,
      companiesSucceeded,
      companiesFailed,
      rawJobsFetched,
      designJobsMatched: jobs.filter((j) => j.status === "active").length,
      upserted: jobs.length,
      markedPotentiallyClosed,
      failures,
      discovery: discoverySummary,
    },
  };
}
