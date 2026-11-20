/**
 * Sweep every known public Greenhouse + Ashby board for design internship
 * titles, promote matches, and merge those roles into the job store.
 *
 * Usage: npx tsx scripts/sweep-design-interns.ts
 */
import { getSeedAllowlist } from "../src/lib/ats/allowlist";
import { loadRemoteAtsDirectories } from "../src/lib/ats/candidate-directories";
import {
  candidateKey,
  loadAtsCandidates,
  type AtsCandidate,
} from "../src/lib/ats/candidates";
import {
  loadDiscoveredBoards,
  saveDiscoveredBoards,
  type DiscoveredBoardRecord,
} from "../src/lib/ats/discovered-store";
import { refreshCompanyJobs } from "../src/lib/ats/fetch-all";
import { isTargetDesignRole } from "../src/lib/ats/filter";
import { loadJobs, persistJobs } from "../src/lib/jobs/store";
import { sleep } from "../src/lib/ats/rate-limit";
import type { AtsProvider, CompanyAllowlistEntry } from "../src/lib/ats/types";

const CONCURRENCY = Number(process.env.SWEEP_CONCURRENCY ?? "10");
const PROVIDERS = new Set<AtsProvider>(["greenhouse", "ashby"]);

function isDesignInternTitle(title: string): boolean {
  if (!isTargetDesignRole(title, "")) return false;
  return /\bintern(?:ship)?\b|\bco-?op\b/i.test(title);
}

async function fetchTitles(
  provider: AtsProvider,
  boardToken: string,
): Promise<{ ok: boolean; titles: string[] }> {
  const url =
    provider === "greenhouse"
      ? `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs`
      : `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(boardToken)}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "FeyzawaJobBoard/1.0 (+intern-sweep)",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return { ok: false, titles: [] };
    const data: unknown = await res.json();
    if (provider === "greenhouse") {
      const jobs = (data as { jobs?: Array<{ title?: string }> }).jobs ?? [];
      return {
        ok: true,
        titles: jobs.map((j) => j.title ?? "").filter(Boolean),
      };
    }
    const jobs =
      (data as { jobs?: Array<{ title?: string; isListed?: boolean }> }).jobs ??
      [];
    return {
      ok: true,
      titles: jobs
        .filter((j) => j.isListed !== false)
        .map((j) => j.title ?? "")
        .filter(Boolean),
    };
  } catch {
    return { ok: false, titles: [] };
  }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!, i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () =>
      worker(),
    ),
  );
  return results;
}

async function main() {
  const [fileRemote, remote, seed, discovered] = await Promise.all([
    loadAtsCandidates(),
    loadRemoteAtsDirectories({ force: true }),
    Promise.resolve(getSeedAllowlist()),
    loadDiscoveredBoards(),
  ]);

  const boards = new Map<string, AtsCandidate>();
  for (const c of [...fileRemote, ...remote, ...seed]) {
    if (!PROVIDERS.has(c.provider as AtsProvider)) continue;
    boards.set(candidateKey(c), {
      name: c.name,
      provider: c.provider as AtsProvider,
      boardToken: c.boardToken,
      careersUrl: c.careersUrl,
    });
  }

  const list = Array.from(boards.values());
  console.log(`Probing ${list.length} Greenhouse/Ashby boards…`);

  let probed = 0;
  let errors = 0;
  const hits: Array<{
    company: AtsCandidate;
    internTitles: string[];
  }> = [];

  await mapPool(list, CONCURRENCY, async (company) => {
    const result = await fetchTitles(company.provider, company.boardToken);
    probed += 1;
    if (probed % 100 === 0 || probed === list.length) {
      console.log(`…${probed}/${list.length} (hits=${hits.length}, errors=${errors})`);
    }
    if (!result.ok) {
      errors += 1;
      return;
    }
    const internTitles = result.titles.filter(isDesignInternTitle);
    if (internTitles.length > 0) {
      hits.push({ company, internTitles });
      console.log(
        `HIT ${company.provider}/${company.boardToken} (${company.name}): ${internTitles.join(" | ")}`,
      );
    }
    await sleep(40);
  });

  console.log(
    `\nDone probing. hits=${hits.length} errors=${errors} probed=${probed}`,
  );

  const now = new Date().toISOString();
  const nextDiscovered: DiscoveredBoardRecord[] = [...discovered];
  for (const hit of hits) {
    const key = candidateKey(hit.company);
    for (let i = nextDiscovered.length - 1; i >= 0; i--) {
      const b = nextDiscovered[i]!;
      if (`${b.provider}:${b.boardToken}` === key) nextDiscovered.splice(i, 1);
    }
    nextDiscovered.push({
      name: hit.company.name,
      provider: hit.company.provider,
      boardToken: hit.company.boardToken,
      careersUrl: hit.company.careersUrl,
      status: "active",
      designJobsFound: hit.internTitles.length,
      lastProbedAt: now,
      source: "discovered",
    });
  }
  await saveDiscoveredBoards(nextDiscovered);
  console.log(`Saved ${hits.length} intern-hiring boards to discovered store`);

  // Fetch full design roles for hit companies (includes the internships).
  let { jobs } = await loadJobs();
  let fetched = 0;
  for (const hit of hits) {
    const entry: CompanyAllowlistEntry = {
      name: hit.company.name,
      provider: hit.company.provider,
      boardToken: hit.company.boardToken,
      careersUrl: hit.company.careersUrl,
    };
    const { jobs: next, summary } = await refreshCompanyJobs(entry, jobs);
    jobs = next;
    fetched += 1;
    const interns = next.filter(
      (j) =>
        j.companyName === entry.name &&
        j.status === "active" &&
        (j.isInternship || j.experienceBand === "intern"),
    );
    console.log(
      `Fetched ${entry.name}: ${interns.length} intern roles stored (${summary.designJobsMatched} design matched)`,
    );
    await sleep(120);
  }

  const summary = {
    startedAt: now,
    finishedAt: new Date().toISOString(),
    companiesAttempted: hits.length,
    companiesSucceeded: fetched,
    companiesFailed: 0,
    rawJobsFetched: 0,
    designJobsMatched: jobs.filter((j) => j.status === "active").length,
    upserted: jobs.length,
    markedPotentiallyClosed: 0,
    failures: [],
  };
  const persist = await persistJobs(jobs, summary);
  const internJobs = jobs.filter(
    (j) =>
      j.status === "active" &&
      (j.isInternship || j.experienceBand === "intern"),
  );
  console.log("\nPersist", persist);
  console.log(`Active design internships now: ${internJobs.length}`);
  for (const j of internJobs.sort((a, b) =>
    a.companyName.localeCompare(b.companyName),
  )) {
    console.log(` - ${j.companyName} — ${j.title}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
