export type AtsProvider = "greenhouse" | "lever" | "ashby";

export type ExperienceBand =
  | "intern"
  | "new_grad"
  | "junior"
  | "associate"
  | "mid"
  | "unknown";

export type WorkStyle = "remote" | "hybrid" | "in_person" | "unknown";

export type EligibilityMark = "possible" | "unclear";

export type ListingStatus = "active" | "potentially_closed";

export interface CompanyAllowlistEntry {
  /** Display name */
  name: string;
  /** ATS provider */
  provider: AtsProvider;
  /**
   * Verified board token/slug for the public API.
   * Greenhouse: boards-api.greenhouse.io/v1/boards/{token}
   * Lever: api.lever.co/v0/postings/{token}
   * Ashby: api.ashbyhq.com/posting-api/job-board/{token}
   */
  boardToken: string;
  /** Optional careers site for humans */
  careersUrl?: string;
  /** Soft priority for UI watchlist defaults */
  watchedByDefault?: boolean;
  enabled?: boolean;
}

export interface RawAtsJob {
  provider: AtsProvider;
  boardToken: string;
  companyName: string;
  sourceId: string;
  title: string;
  applyUrl: string;
  locationText: string;
  descriptionHtml?: string;
  descriptionText?: string;
  absoluteUrl?: string;
  postedAt?: string | null;
  updatedAt?: string | null;
  raw: unknown;
}

export interface NormalizedJob {
  id: string;
  companyName: string;
  provider: AtsProvider;
  boardToken: string;
  sourceId: string;
  title: string;
  applyUrl: string;
  locationText: string;
  descriptionText: string;
  experienceBand: ExperienceBand;
  workStyle: WorkStyle;
  city: string | null;
  stateRegion: string | null;
  countryCode: string | null;
  isCalifornia: boolean;
  isRemote: boolean;
  isInternship: boolean;
  isFullTime: boolean;
  eligibility: EligibilityMark;
  eligibilityReasons: string[];
  earlyCareerScore: number;
  postedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  lastVerifiedAt: string;
  status: ListingStatus;
  titleMatched: boolean;
}

export interface FetchCompanyResult {
  company: CompanyAllowlistEntry;
  ok: boolean;
  jobs: RawAtsJob[];
  error?: string;
  statusCode?: number;
  fetchedAt: string;
}

export interface RefreshSummary {
  startedAt: string;
  finishedAt: string;
  companiesAttempted: number;
  companiesSucceeded: number;
  companiesFailed: number;
  rawJobsFetched: number;
  designJobsMatched: number;
  upserted: number;
  markedPotentiallyClosed: number;
  failures: Array<{ company: string; provider: AtsProvider; error: string }>;
}
