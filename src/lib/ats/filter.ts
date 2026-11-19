import type { ExperienceBand, RawAtsJob } from "./types";

/** Target design titles and close variants (case-insensitive). */
const INCLUDE_TITLE_PATTERNS: RegExp[] = [
  /\bproduct\s*designer\b/i,
  /\bux\s*designer\b/i,
  /\bui\s*designer\b/i,
  /\bux\s*\/\s*ui\b/i,
  /\bui\s*\/\s*ux\b/i,
  /\bux\/ui\b/i,
  /\binteraction\s*designer\b/i,
  /\bassociate\s+(?:product\s+)?designer\b/i,
  /\bjunior\s+(?:product\s+|ux\s+|ui\s+)?designer\b/i,
  /\bdesign\s+intern(?:ship)?\b/i,
  /\bproduct\s+design\s+intern(?:ship)?\b/i,
  /\bux\s+intern(?:ship)?\b/i,
  /\bui\s+intern(?:ship)?\b/i,
  /\bvisual\s+designer\b/i,
  /\bdesign\s+systems?\s+designer\b/i,
  /\bexperience\s+designer\b/i,
  /\bcontent\s+designer\b/i,
  /\bux\s+writer\b/i,
];

/** Hard seniority excludes unless early-career signal also present. */
const SENIORITY_EXCLUDE: RegExp[] = [
  /\bsenior\b/i,
  /\bsr\.?\b/i,
  /\bstaff\b/i,
  /\bprincipal\b/i,
  /\blead\b/i,
  /\bdirector\b/i,
  /\bhead of\b/i,
  /\bmanager\b/i,
  /\bvp\b/i,
];

const EARLY_CAREER_SIGNAL: RegExp[] = [
  /\bintern(?:ship)?\b/i,
  /\bco-?op\b/i,
  /\bnew\s*grad(?:uate)?\b/i,
  /\bearly\s*career\b/i,
  /\buniversity\b/i,
  /\bcampus\b/i,
  /\bjunior\b/i,
  /\bassociate\b/i,
  /\bentry[\s-]?level\b/i,
  /\bclass of\s*20\d{2}\b/i,
  /\b20(2[5-9]|3[0-2])\b/,
];

export function isTargetDesignTitle(title: string): boolean {
  if (!INCLUDE_TITLE_PATTERNS.some((p) => p.test(title))) {
    return false;
  }
  const hasSeniority = SENIORITY_EXCLUDE.some((p) => p.test(title));
  if (hasSeniority) {
    return EARLY_CAREER_SIGNAL.some((p) => p.test(title));
  }
  return true;
}

export function classifyExperienceBand(
  title: string,
  description: string,
): ExperienceBand {
  const text = `${title}\n${description}`;
  if (/\bintern(?:ship)?\b|\bco-?op\b/i.test(text)) return "intern";
  if (/\bnew\s*grad|\bgraduate\s+program|\bclass of\b/i.test(text))
    return "new_grad";
  if (/\bjunior\b|\bentry[\s-]?level\b|\bearly\s*career\b/i.test(text))
    return "junior";
  if (/\bassociate\b/i.test(title)) return "associate";
  if (SENIORITY_EXCLUDE.some((p) => p.test(title))) return "mid";
  return "unknown";
}

/** Higher = more early-career relevant. Ambiguous roles are NOT auto-excluded. */
export function earlyCareerScore(
  title: string,
  description: string,
  band: ExperienceBand,
): number {
  let score = 0;
  const text = `${title}\n${description}`.toLowerCase();

  if (band === "intern") score += 40;
  if (band === "new_grad") score += 35;
  if (band === "junior") score += 25;
  if (band === "associate") score += 15;
  if (band === "unknown") score += 8; // keep ambiguous; do not exclude

  if (/new\s*grad|recent\s*grad|class of\s*202[6-9]|university|campus/.test(text))
    score += 12;
  if (/0-1 years|0–1 years|1\+? years|less than 2|up to 2 years/.test(text))
    score += 8;
  if (/portfolio/.test(text)) score += 2;

  // Soft demote strong mid+ signals without early-career language
  if (
    SENIORITY_EXCLUDE.some((p) => p.test(title)) &&
    !EARLY_CAREER_SIGNAL.some((p) => p.test(title))
  ) {
    score -= 30;
  }

  return score;
}

export function passesDesignFilter(job: RawAtsJob): boolean {
  return isTargetDesignTitle(job.title);
}
