import { getSeedAllowlist } from "./allowlist";
import { candidateKey, loadAtsCandidates } from "./candidates";
import {
  activeDiscoveredEntries,
  loadDiscoveredBoards,
  saveDiscoveredBoards,
  skipProbeKeySet,
} from "./discovered-store";
import { isTargetDesignRole } from "./filter";
import { ATS_FETCH_DELAY_MS, fetchWithRetry, sleep } from "./rate-limit";
import type {
  AtsProvider,
  CompanyAllowlistEntry,
  DiscoverSummary,
} from "./types";

function discoverBatchSize(defaultSize: number): number {
  const raw = process.env.DISCOVER_BATCH_SIZE;
  if (!raw) return defaultSize;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : defaultSize;
}

async function fetchTitles(
  provider: AtsProvider,
  boardToken: string,
): Promise<{ ok: boolean; titles: string[]; status?: number }> {
  let url: string;
  if (provider === "greenhouse") {
    url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs`;
  } else if (provider === "lever") {
    url = `https://api.lever.co/v0/postings/${encodeURIComponent(boardToken)}?mode=json`;
  } else {
    url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(boardToken)}`;
  }

  try {
    const res = await fetchWithRetry(url);
    if (!res.ok) {
      return { ok: false, titles: [], status: res.status };
    }
    const data: unknown = await res.json();
    let titles: string[] = [];
    if (provider === "greenhouse") {
      const jobs = (data as { jobs?: Array<{ title?: string }> }).jobs ?? [];
      titles = jobs.map((j) => j.title ?? "").filter(Boolean);
    } else if (provider === "lever") {
      const jobs = Array.isArray(data)
        ? (data as Array<{ text?: string }>)
        : [];
      titles = jobs.map((j) => j.text ?? "").filter(Boolean);
    } else {
      const jobs =
        (data as { jobs?: Array<{ title?: string; isListed?: boolean }> })
          .jobs ?? [];
      titles = jobs
        .filter((j) => j.isListed !== false)
        .map((j) => j.title ?? "")
        .filter(Boolean);
    }
    return { ok: true, titles, status: res.status };
  } catch {
    return { ok: false, titles: [] };
  }
}

/**
 * Probe a batch of never-seen ATS candidates. Promote boards that currently
 * list at least one early-career design title into the dynamic allowlist.
 */
export async function discoverNewBoards(options?: {
  batchSize?: number;
}): Promise<{
  summary: DiscoverSummary;
  allowlist: CompanyAllowlistEntry[];
}> {
  // Default 120: chew through remote ATS directories faster on the daily cron.
  const batchSize = options?.batchSize ?? discoverBatchSize(120);
  const seed = getSeedAllowlist();
  const seedKeys = new Set(seed.map((c) => candidateKey(c)));
  const discovered = await loadDiscoveredBoards();
  // Re-check empty/error boards after a week in case design roles open later.
  const skipProbe = skipProbeKeySet(discovered);

  const candidates = (await loadAtsCandidates()).filter((c) => {
    const key = candidateKey(c);
    return !seedKeys.has(key) && !skipProbe.has(key);
  });

  // Prefer never-probed boards, then older empty/error rechecks.
  const batch = candidates.slice(0, batchSize);
  const now = new Date().toISOString();
  const promotedNames: string[] = [];
  let promoted = 0;
  let empty = 0;
  let errors = 0;

  const nextRecords = [...discovered];

  for (const candidate of batch) {
    const result = await fetchTitles(candidate.provider, candidate.boardToken);
    const key = candidateKey(candidate);
    // Drop any stale copy
    for (let i = nextRecords.length - 1; i >= 0; i--) {
      const b = nextRecords[i]!;
      if (`${b.provider}:${b.boardToken}` === key) nextRecords.splice(i, 1);
    }

    if (!result.ok) {
      errors += 1;
      nextRecords.push({
        name: candidate.name,
        provider: candidate.provider,
        boardToken: candidate.boardToken,
        careersUrl: candidate.careersUrl,
        status: "error",
        designJobsFound: 0,
        lastProbedAt: now,
        source: "discovered",
      });
    } else {
      const designCount = result.titles.filter((t) =>
        isTargetDesignRole(t),
      ).length;
      if (designCount > 0) {
        promoted += 1;
        promotedNames.push(candidate.name);
        nextRecords.push({
          name: candidate.name,
          provider: candidate.provider,
          boardToken: candidate.boardToken,
          careersUrl: candidate.careersUrl,
          status: "active",
          designJobsFound: designCount,
          lastProbedAt: now,
          source: "discovered",
        });
      } else {
        empty += 1;
        nextRecords.push({
          name: candidate.name,
          provider: candidate.provider,
          boardToken: candidate.boardToken,
          careersUrl: candidate.careersUrl,
          status: "empty",
          designJobsFound: 0,
          lastProbedAt: now,
          source: "discovered",
        });
      }
    }

    await sleep(ATS_FETCH_DELAY_MS);
  }

  if (batch.length > 0) {
    try {
      await saveDiscoveredBoards(nextRecords);
    } catch (err) {
      // Never abort the job refresh because discovery persistence failed
      // (e.g. read-only FS on Vercel). In-memory allowlist still applies.
      console.warn("[discover] saveDiscoveredBoards failed:", err);
    }
  }

  const allowlist = mergeAllowlist(seed, activeDiscoveredEntries(nextRecords));

  return {
    summary: {
      probed: batch.length,
      promoted,
      empty,
      errors,
      promotedNames,
      remainingCandidates: Math.max(0, candidates.length - batch.length),
    },
    allowlist,
  };
}

export function mergeAllowlist(
  seed: CompanyAllowlistEntry[],
  discovered: CompanyAllowlistEntry[],
): CompanyAllowlistEntry[] {
  const map = new Map<string, CompanyAllowlistEntry>();
  for (const entry of [...seed, ...discovered]) {
    if (entry.enabled === false) continue;
    map.set(candidateKey(entry), entry);
  }
  return Array.from(map.values());
}

export async function getEffectiveAllowlist(): Promise<CompanyAllowlistEntry[]> {
  const seed = getSeedAllowlist();
  const discovered = activeDiscoveredEntries(await loadDiscoveredBoards());
  return mergeAllowlist(seed, discovered);
}
