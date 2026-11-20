import type { EligibilityMark, ExperienceBand, WorkStyle } from "./types";

export interface EligibilityResult {
  eligibility: EligibilityMark;
  reasons: string[];
  isCalifornia: boolean;
  isRemote: boolean;
  isInternship: boolean;
  isFullTime: boolean;
  workStyle: WorkStyle;
  city: string | null;
  stateRegion: string | null;
  countryCode: string | null;
}

const CA_PATTERNS = [
  /\bcalifornia\b/i,
  /\b,\s*ca\b/i,
  /\bca\b/i,
  /\bsan francisco\b/i,
  /\bsf\b/i,
  /\bbay area\b/i,
  /\blos angeles\b/i,
  /\bpalo alto\b/i,
  /\bmountain view\b/i,
  /\bsunnyvale\b/i,
  /\bsan jose\b/i,
  /\bsanta monica\b/i,
  /\birvine\b/i,
  /\bsacramento\b/i,
  /\boakland\b/i,
  /\bberkeley\b/i,
  /\bmenlo park\b/i,
  /\bredwood city\b/i,
  /\bcupertino\b/i,
];

const REMOTE_PATTERNS = [
  /\bremote\b/i,
  /\bwork from home\b/i,
  /\bwfh\b/i,
  /\banywhere\b/i,
  /\bdistributed\b/i,
];

const HYBRID_PATTERNS = [/\bhybrid\b/i];

const US_NATIONWIDE = [
  /\bunited states\b/i,
  /\busa\b/i,
  /\bu\.s\.a?\b/i,
  /\bus only\b/i,
  /\bnationwide\b/i,
  /\bremote[,\s-]+us\b/i,
  /\bus remote\b/i,
];

const RECENT_GRAD_ACCEPT = [
  /\brecent\s+grad/i,
  /\bnew\s*grad/i,
  /\bclass of\s*202[5-9]/i,
  /\bgraduating\s+(in\s+)?202[5-9]/i,
  /\buniversity\s+(hire|grad|recruit)/i,
  /\bcampus\s+(hire|recruit)/i,
  /\bearly\s*career/i,
  /\b0-1\s+years?/i,
  /\bless than\s+2\s+years?/i,
  /\bno\s+prior\s+experience\s+required/i,
];

/**
 * Mark eligibility from JD + location text.
 * Priority targets:
 * - California-based full-time
 * - Nationwide internships that accept recent graduates
 * - Remote when eligible
 *
 * Do NOT assume every entry-level role accepts 2027 grads.
 */
export function assessEligibility(input: {
  title: string;
  locationText: string;
  descriptionText: string;
  experienceBand: ExperienceBand;
}): EligibilityResult {
  const { title, locationText, descriptionText, experienceBand } = input;
  const blob = `${title}\n${locationText}\n${descriptionText}`;
  const reasons: string[] = [];

  const isCalifornia = CA_PATTERNS.some((p) => p.test(locationText)) ||
    (/\bcalifornia\b/i.test(blob) && !/\bexcept california\b/i.test(blob));
  const isRemote = REMOTE_PATTERNS.some((p) => p.test(locationText)) ||
    REMOTE_PATTERNS.some((p) => p.test(title));
  const isHybrid = HYBRID_PATTERNS.some((p) => p.test(blob));
  const isInternship =
    experienceBand === "intern" || /\bintern(?:ship)?\b/i.test(title);
  const isFullTime =
    /\bfull[-\s]?time\b/i.test(blob) ||
    (!isInternship && !/\bpart[-\s]?time\b/i.test(blob));

  const usNationwide =
    US_NATIONWIDE.some((p) => p.test(locationText)) ||
    (isRemote && /\bUS\b|\bUnited States\b/i.test(blob));

  const acceptsRecentGrad = RECENT_GRAD_ACCEPT.some((p) => p.test(blob));
  const mentions2027 = /2027/.test(blob);
  const mentionsGradYear = /class of\s*20\d{2}|graduat\w+\s+20\d{2}/i.test(
    blob,
  );

  let workStyle: WorkStyle = "unknown";
  if (isRemote && isHybrid) workStyle = "hybrid";
  else if (isRemote) workStyle = "remote";
  else if (isHybrid) workStyle = "hybrid";
  else if (locationText.trim()) workStyle = "in_person";

  let eligibility: EligibilityMark = "unclear";

  // Possible: CA full-time design role
  if (isCalifornia && isFullTime && !isInternship) {
    eligibility = "possible";
    reasons.push("California-based full-time location signal");
  }

  // Possible: internship with nationwide/remote + recent-grad language
  if (isInternship && (usNationwide || isRemote || isCalifornia)) {
    if (acceptsRecentGrad || mentions2027 || experienceBand === "intern") {
      eligibility = "possible";
      reasons.push(
        acceptsRecentGrad || mentions2027
          ? "Internship with explicit recent-grad / class-year language"
          : "Internship in CA / US / remote — recent-grad acceptance not explicit",
      );
    }
  }

  // Possible: remote when JD clearly opens to US/CA early career
  if (isRemote && (isCalifornia || usNationwide) && acceptsRecentGrad) {
    eligibility = "possible";
    reasons.push("Remote role with US/CA scope and recent-grad language");
  }

  // Possible: ambiguous early-career FT in CA/remote
  if (eligibility === "unclear") {
    if (
      (isCalifornia || isRemote || usNationwide) &&
      (experienceBand === "new_grad" ||
        experienceBand === "junior" ||
        experienceBand === "associate" ||
        experienceBand === "unknown")
    ) {
      eligibility = "possible";
      if (isCalifornia) reasons.push("California location; seniority acceptance unclear");
      else if (isRemote) reasons.push("Remote listing; graduate-year eligibility unclear");
      else reasons.push("US/nationwide listing; graduate-year eligibility unclear");
    }
  }

  // Explicit caution: don't assume 2027 if not mentioned
  if (
    !mentions2027 &&
    !mentionsGradYear &&
    experienceBand !== "intern" &&
    eligibility !== "unclear"
  ) {
    reasons.push(
      "JD does not explicitly mention 2027 / graduating class — not assumed",
    );
  }

  if (reasons.length === 0) {
    reasons.push("Insufficient location / graduate-year signals in JD text");
  }

  const { city, stateRegion, countryCode } = parseLocation(locationText);

  return {
    eligibility,
    reasons,
    isCalifornia,
    isRemote,
    isInternship,
    isFullTime,
    workStyle,
    city,
    stateRegion,
    countryCode,
  };
}

function parseLocation(locationText: string): {
  city: string | null;
  stateRegion: string | null;
  countryCode: string | null;
} {
  const text = locationText.split(/[•|]/)[0]?.trim() ?? "";
  if (!text) {
    return { city: null, stateRegion: null, countryCode: null };
  }

  let countryCode: string | null = null;
  if (/\bunited states\b|\busa\b|\bu\.s\./i.test(locationText) || /,\s*US\b/.test(locationText)) {
    countryCode = "US";
  } else if (/\bcanada\b/i.test(locationText)) countryCode = "CA";
  else if (/\bunited kingdom\b|\buk\b/i.test(locationText)) countryCode = "GB";

  const caMatch = text.match(
    /^([^,]+),\s*(CA|California)\b/i,
  );
  if (caMatch) {
    return {
      city: caMatch[1].trim(),
      stateRegion: "CA",
      countryCode: countryCode ?? "US",
    };
  }

  const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      city: parts[0],
      stateRegion: parts[1].length <= 3 ? parts[1].toUpperCase() : parts[1],
      countryCode,
    };
  }

  return { city: text || null, stateRegion: null, countryCode };
}
