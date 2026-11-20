import type { ExperienceBand, RawAtsJob } from "./types";
import { stripHtml } from "./text";

/**
 * Strong design-title matches (case-insensitive).
 * Keep this broad — early-career gating is handled separately.
 */
const INCLUDE_TITLE_PATTERNS: RegExp[] = [
  // Core product / UX / UI
  /\bproduct\s*designer\b/i,
  /\bproduct\s*design\b/i,
  /\bux\s*designer\b/i,
  /\bui\s*designer\b/i,
  /\bux\s*design\b/i,
  /\bui\s*design\b/i,
  /\bux\s*\/\s*ui\b/i,
  /\bui\s*\/\s*ux\b/i,
  /\bux\/ui\b/i,
  /\bui\/ux\b/i,
  /\binteraction\s*designer\b/i,
  /\binteraction\s*design\b/i,
  /\bexperience\s*designer\b/i,
  /\buser\s+experience\s+design(?:er)?\b/i,
  /\buser\s+interface\s+design(?:er)?\b/i,
  // AI product / agent UX titles
  /\bconversation(?:al)?\s*designer\b/i,
  /\bagent\s+(?:ux|experience)\s*designer\b/i,
  /\bfounding\s+designer\b/i,

  // Content / systems / visual
  /\bcontent\s*designer\b/i,
  /\bcontent\s*design\b/i,
  /\bux\s*writer\b/i,
  /\bux\s*writing\b/i,
  /\bdesign\s+systems?\s*(?:designer)?\b/i,
  /\bvisual\s*designer\b/i,
  /\bvisual\s*design\b/i,
  /\bmotion\s*designer\b/i,
  /\bbrand\s*designer\b/i,
  /\bdigital\s*designer\b/i,
  /\bweb\s*designer\b/i,
  /\bgraphic\s*designer\b/i,
  /\bcommunication\s*designer\b/i,

  // Early-career / level phrasing
  /\bassociate\s+(?:product\s+|ux\s+|ui\s+|visual\s+|content\s+)?design(?:er)?\b/i,
  /\bjunior\s+(?:product\s+|ux\s+|ui\s+|visual\s+|content\s+)?design(?:er)?\b/i,
  /\bdesign\s+intern(?:ship)?\b/i,
  /\bproduct\s+design\s+intern(?:ship)?\b/i,
  /\bux\s+intern(?:ship)?\b/i,
  /\bui\s+intern(?:ship)?\b/i,
  /\bcontent\s+design\s+intern(?:ship)?\b/i,
  /\bfigma\b/i,
];

/** Title looks design-related even if not an exact "X Designer" phrase. */
const DESIGNISH_TITLE: RegExp =
  /\b(design(?:er|ing)?|ux|ui|figma|prototyp(?:e|ing)|wirefram)/i;

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

const FIGMA: RegExp = /\bfigma\b/i;

function hasEarlyCareerSignal(title: string, description = ""): boolean {
  const text = `${title}\n${description}`;
  return EARLY_CAREER_SIGNAL.some((p) => p.test(text));
}

function passesSeniorityGate(title: string, description = ""): boolean {
  const hasSeniority = SENIORITY_EXCLUDE.some((p) => p.test(title));
  if (!hasSeniority) return true;
  return hasEarlyCareerSignal(title, description);
}

/**
 * Include a role when:
 * - Title matches a design pattern, or
 * - Title is design-ish and Figma is mentioned in the title or description, or
 * - Title itself mentions Figma
 *
 * Senior titles still need an early-career signal (title or description).
 */
export function isTargetDesignRole(
  title: string,
  description = "",
): boolean {
  const strongTitle = INCLUDE_TITLE_PATTERNS.some((p) => p.test(title));
  const designish = DESIGNISH_TITLE.test(title);
  const figmaHit = FIGMA.test(title) || FIGMA.test(description);
  const figmaDesignRole = designish && figmaHit;

  if (!strongTitle && !figmaDesignRole) {
    return false;
  }
  return passesSeniorityGate(title, description);
}

/** @deprecated use isTargetDesignRole — kept for title-only discovery probes */
export function isTargetDesignTitle(title: string): boolean {
  return isTargetDesignRole(title, "");
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
  if (/\bfigma\b/.test(text)) score += 3;

  // Soft demote strong mid+ signals without early-career language
  if (
    SENIORITY_EXCLUDE.some((p) => p.test(title)) &&
    !hasEarlyCareerSignal(title, description)
  ) {
    score -= 30;
  }

  return score;
}

export function passesDesignFilter(job: RawAtsJob): boolean {
  const description = stripHtml(
    job.descriptionText || job.descriptionHtml || "",
  );
  return isTargetDesignRole(job.title, description);
}
