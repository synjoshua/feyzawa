/**
 * Sweep every known public Greenhouse + Ashby board for design roles in a
 * target experience band, promote matches, and merge into the job store.
 *
 * Usage:
 *   npx tsx scripts/sweep-design-roles.ts --band=intern
 *   npx tsx scripts/sweep-design-roles.ts --band=early
 *   npx tsx scripts/sweep-design-roles.ts --band=all
 *
 * early = new grad / junior / associate / entry-level / early career (not senior)
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
import {
  classifyExperienceBand,
  isTargetDesignRole,
} from "../src/lib/ats/filter";
import { loadJobs, persistJobs } from "../src/lib/jobs/store";
import { sleep } from "../src/lib/ats/rate-limit";
import type { AtsProvider, CompanyAllowlistEntry } from "../src/lib/ats/types";

const CONCURRENCY = Number(process.env.SWEEP_CONCURRENCY ?? "10");
const PROVIDERS = new Set<AtsProvider>(["greenhouse", "ashby"]);

type SweepBand = "intern" | "early" | "all";

function parseBand(argv: string[]): SweepBand {
  const arg = argv.find((a) => a.startsWith("--band="));
  const value = (arg?.split("=")[1] || "early").toLowerCase();
  if (value === "intern" || value === "early" || value === "all") return value;
  throw new Error(`Unknown --band=${value} (use intern|early|all)`);
}

const EARLY_TITLE =
  /\b(?:new\s*grad(?:uate)?|recent\s+grad(?:uate)?|junior|associate|entry[\s-]?level|early\s*career|university|campus|class of\s*20\d{2})\b/i;

const SENIOR_TITLE =
  /\b(?:senior|sr\.?|staff|principal|lead|director|head of|manager|vp)\b/i;

function titleMatchesBand(title: string, band: SweepBand): boolean {
  if (!isTargetDesignRole(title, "")) return false;
  if (band === "all") return true;

  const classified = classifyExperienceBand(title, "");
  if (band === "intern") {
    return (
      classified === "intern" || /\bintern(?:ship)?\b|\bco-?op\b/i.test(title)
    );
  }

  // early: new grad / junior / associate + non-senior IC design titles
  // (so we fetch boards where the JD may mark new-grad even if the title doesn't)
  if (SENIOR_TITLE.test(title) && !EARLY_TITLE.test(title)) return false;
  if (classified === "intern") return false; // intern sweep covers those
  if (
    classified === "new_grad" ||
    classified === "junior" ||
    classified === "associate"
  ) {
    return true;
  }
  if (EARLY_TITLE.test(title)) return true;
  return /\b(?:product|ux|ui|visual|content|brand|interaction|experience)\s*design(?:er)?\b/i.test(
    title,
  );
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
        "User-Agent": "FeyzawaJobBoard/1.0 (+role-sweep)",
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
  const band = parseBand(process.argv.slice(2));
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
  console.log(
    `Sweep band=${band}. Probing ${list.length} Greenhouse/Ashby boards…`,
  );

  let probed = 0;
  let errors = 0;
  const hits: Array<{ company: AtsCandidate; titles: string[] }> = [];

  await mapPool(list, CONCURRENCY, async (company) => {
    const result = await fetchTitles(company.provider, company.boardToken);
    probed += 1;
    if (probed % 100 === 0 || probed === list.length) {
      console.log(
        `…${probed}/${list.length} (hits=${hits.length}, errors=${errors})`,
      );
    }
    if (!result.ok) {
      errors += 1;
      return;
    }
    const matched = result.titles.filter((t) => titleMatchesBand(t, band));
    if (matched.length > 0) {
      hits.push({ company, titles: matched });
      console.log(
        `HIT ${company.provider}/${company.boardToken} (${company.name}): ${matched.join(" | ")}`,
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
      designJobsFound: hit.titles.length,
      lastProbedAt: now,
      source: "discovered",
    });
  }
  await saveDiscoveredBoards(nextDiscovered);
  console.log(`Saved ${hits.length} boards to discovered store`);

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
    const kept = next.filter(
      (j) => j.companyName === entry.name && j.status === "active",
    );
    console.log(
      `Fetched ${entry.name}: ${kept.length} active design roles (matched ${summary.designJobsMatched})`,
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

  const active = jobs.filter((j) => j.status === "active");
  const byBand = (b: string) =>
    active.filter((j) => j.experienceBand === b || (b === "intern" && j.isInternship));

  console.log("\nPersist", persist);
  console.log(`Active design roles: ${active.length}`);
  console.log(`  intern: ${byBand("intern").length}`);
  console.log(`  new_grad: ${byBand("new_grad").length}`);
  console.log(`  junior: ${byBand("junior").length}`);
  console.log(`  associate: ${byBand("associate").length}`);
  console.log(`  senior/mid: ${active.filter((j) => j.experienceBand === "senior" || j.experienceBand === "mid").length}`);
  console.log(`  unknown: ${byBand("unknown").length}`);

  const early = active.filter((j) =>
    ["new_grad", "junior", "associate"].includes(j.experienceBand),
  );
  for (const j of early.sort((a, b) => a.companyName.localeCompare(b.companyName))) {
    console.log(` - [${j.experienceBand}] ${j.companyName} — ${j.title}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
