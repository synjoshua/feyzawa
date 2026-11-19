import { createHash } from "crypto";
import { assessEligibility } from "./eligibility";
import {
  classifyExperienceBand,
  earlyCareerScore,
  passesDesignFilter,
} from "./filter";
import type { NormalizedJob, RawAtsJob } from "./types";
import { normalizeWhitespace, stripHtml } from "./text";

export function buildJobId(
  provider: string,
  boardToken: string,
  sourceId: string,
): string {
  return createHash("sha256")
    .update(`${provider}:${boardToken}:${sourceId}`)
    .digest("hex")
    .slice(0, 24);
}

export function normalizeJob(
  raw: RawAtsJob,
  nowIso: string,
  existing?: NormalizedJob | null,
): NormalizedJob | null {
  if (!passesDesignFilter(raw)) return null;
  if (!raw.applyUrl) return null;

  // Defensive: some ATS payloads leave HTML in text fields
  const descriptionText = normalizeWhitespace(
    stripHtml(raw.descriptionText || raw.descriptionHtml || ""),
  );
  const experienceBand = classifyExperienceBand(raw.title, descriptionText);
  const eligibility = assessEligibility({
    title: raw.title,
    locationText: raw.locationText,
    descriptionText,
    experienceBand,
  });

  return {
    id: buildJobId(raw.provider, raw.boardToken, raw.sourceId),
    companyName: raw.companyName,
    provider: raw.provider,
    boardToken: raw.boardToken,
    sourceId: raw.sourceId,
    title: normalizeWhitespace(raw.title),
    applyUrl: raw.applyUrl,
    locationText: normalizeWhitespace(raw.locationText),
    descriptionText: descriptionText.slice(0, 20000),
    experienceBand,
    workStyle: eligibility.workStyle,
    city: eligibility.city,
    stateRegion: eligibility.stateRegion,
    countryCode: eligibility.countryCode,
    isCalifornia: eligibility.isCalifornia,
    isRemote: eligibility.isRemote,
    isInternship: eligibility.isInternship,
    isFullTime: eligibility.isFullTime,
    eligibility: eligibility.eligibility,
    eligibilityReasons: eligibility.reasons,
    earlyCareerScore: earlyCareerScore(
      raw.title,
      descriptionText,
      experienceBand,
    ),
    postedAt: raw.postedAt ?? null,
    firstSeenAt: existing?.firstSeenAt ?? nowIso,
    lastSeenAt: nowIso,
    lastVerifiedAt: nowIso,
    status: "active",
    titleMatched: true,
  };
}

/** Dedupe by stable id; prefer richer description / higher early-career score. */
export function dedupeJobs(jobs: NormalizedJob[]): NormalizedJob[] {
  const map = new Map<string, NormalizedJob>();
  for (const job of jobs) {
    const prev = map.get(job.id);
    if (!prev) {
      map.set(job.id, job);
      continue;
    }
    const prefer =
      job.descriptionText.length > prev.descriptionText.length ||
      job.earlyCareerScore > prev.earlyCareerScore
        ? job
        : prev;
    map.set(job.id, {
      ...prefer,
      firstSeenAt:
        prev.firstSeenAt < job.firstSeenAt
          ? prev.firstSeenAt
          : job.firstSeenAt,
      lastSeenAt:
        prev.lastSeenAt > job.lastSeenAt ? prev.lastSeenAt : job.lastSeenAt,
    });
  }
  return Array.from(map.values());
}

export function sortJobs(jobs: NormalizedJob[]): NormalizedJob[] {
  return [...jobs].sort((a, b) => {
    // Active first
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    // Eligibility confirmed > possible > unclear
    const el = { confirmed: 0, possible: 1, unclear: 2 } as const;
    if (el[a.eligibility] !== el[b.eligibility]) {
      return el[a.eligibility] - el[b.eligibility];
    }
    // Early career score
    if (b.earlyCareerScore !== a.earlyCareerScore) {
      return b.earlyCareerScore - a.earlyCareerScore;
    }
    // Newer last seen
    return b.lastSeenAt.localeCompare(a.lastSeenAt);
  });
}
