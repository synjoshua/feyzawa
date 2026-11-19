import type { CompanyAllowlistEntry } from "./types";

/**
 * Configurable allowlist of design-hiring companies with verified public board IDs.
 * Verified against live public ATS endpoints (no API keys) during V1 build.
 *
 * To add a company:
 * 1. Find the public job board URL (Greenhouse/Lever/Ashby).
 * 2. Extract the board token/slug (see README / docs/setup.md).
 * 3. Confirm the public JSON endpoint returns 200.
 * 4. Append an entry below (or override via COMPANY_ALLOWLIST_JSON env).
 */
export const DEFAULT_COMPANY_ALLOWLIST: CompanyAllowlistEntry[] = [
  // Greenhouse
  {
    name: "Stripe",
    provider: "greenhouse",
    boardToken: "stripe",
    careersUrl: "https://stripe.com/jobs",
    watchedByDefault: true,
  },
  {
    name: "Figma",
    provider: "greenhouse",
    boardToken: "figma",
    careersUrl: "https://www.figma.com/careers/",
    watchedByDefault: true,
  },
  {
    name: "Pinterest",
    provider: "greenhouse",
    boardToken: "pinterest",
    careersUrl: "https://www.pinterestcareers.com/",
    watchedByDefault: true,
  },
  {
    name: "Duolingo",
    provider: "greenhouse",
    boardToken: "duolingo",
    careersUrl: "https://careers.duolingo.com/",
    watchedByDefault: true,
  },
  {
    name: "Lyft",
    provider: "greenhouse",
    boardToken: "lyft",
    careersUrl: "https://www.lyft.com/careers",
  },
  {
    name: "Robinhood",
    provider: "greenhouse",
    boardToken: "robinhood",
    careersUrl: "https://careers.robinhood.com/",
  },
  {
    name: "Asana",
    provider: "greenhouse",
    boardToken: "asana",
    careersUrl: "https://asana.com/jobs",
  },
  {
    name: "Airbnb",
    provider: "greenhouse",
    boardToken: "airbnb",
    careersUrl: "https://careers.airbnb.com/",
  },
  {
    name: "Dropbox",
    provider: "greenhouse",
    boardToken: "dropbox",
    careersUrl: "https://jobs.dropbox.com/",
  },
  {
    name: "Discord",
    provider: "greenhouse",
    boardToken: "discord",
    careersUrl: "https://discord.com/careers",
  },
  {
    name: "Brex",
    provider: "greenhouse",
    boardToken: "brex",
    careersUrl: "https://www.brex.com/careers",
  },
  {
    name: "Gusto",
    provider: "greenhouse",
    boardToken: "gusto",
    careersUrl: "https://gusto.com/about/careers",
  },
  {
    name: "Affirm",
    provider: "greenhouse",
    boardToken: "affirm",
    careersUrl: "https://www.affirm.com/careers",
  },
  {
    name: "Chime",
    provider: "greenhouse",
    boardToken: "chime",
    careersUrl: "https://www.chime.com/careers/",
  },
  {
    name: "Reddit",
    provider: "greenhouse",
    boardToken: "reddit",
    careersUrl: "https://www.redditinc.com/careers",
  },
  {
    name: "Datadog",
    provider: "greenhouse",
    boardToken: "datadog",
    careersUrl: "https://careers.datadoghq.com/",
  },
  {
    name: "Twilio",
    provider: "greenhouse",
    boardToken: "twilio",
    careersUrl: "https://www.twilio.com/company/jobs",
  },
  {
    name: "Box",
    provider: "greenhouse",
    boardToken: "boxinc",
    careersUrl: "https://www.box.com/careers",
  },
  {
    name: "Airtable",
    provider: "greenhouse",
    boardToken: "airtable",
    careersUrl: "https://airtable.com/careers",
  },
  {
    name: "Coinbase",
    provider: "greenhouse",
    boardToken: "coinbase",
    careersUrl: "https://www.coinbase.com/careers",
  },

  // Lever
  {
    name: "Palantir",
    provider: "lever",
    boardToken: "palantir",
    careersUrl: "https://www.palantir.com/careers/",
    watchedByDefault: true,
  },
  {
    name: "Spotify",
    provider: "lever",
    boardToken: "spotify",
    careersUrl: "https://www.lifeatspotify.com/",
  },

  // Ashby
  {
    name: "Notion",
    provider: "ashby",
    boardToken: "notion",
    careersUrl: "https://www.notion.com/careers",
    watchedByDefault: true,
  },
  {
    name: "Linear",
    provider: "ashby",
    boardToken: "linear",
    careersUrl: "https://linear.app/careers",
    watchedByDefault: true,
  },
  {
    name: "Ramp",
    provider: "ashby",
    boardToken: "ramp",
    careersUrl: "https://ramp.com/careers",
    watchedByDefault: true,
  },
  {
    name: "OpenAI",
    provider: "ashby",
    boardToken: "openai",
    careersUrl: "https://openai.com/careers",
    watchedByDefault: true,
  },
  {
    name: "Replit",
    provider: "ashby",
    boardToken: "replit",
    careersUrl: "https://replit.com/site/careers",
  },
  {
    name: "Cursor",
    provider: "ashby",
    boardToken: "cursor",
    careersUrl: "https://cursor.com/careers",
  },
  {
    name: "Perplexity",
    provider: "ashby",
    boardToken: "perplexity",
    careersUrl: "https://www.perplexity.ai/careers",
  },
  {
    name: "Watershed",
    provider: "ashby",
    boardToken: "watershed",
    careersUrl: "https://watershed.com/careers",
  },
  {
    name: "Benchling",
    provider: "ashby",
    boardToken: "benchling",
    careersUrl: "https://www.benchling.com/careers",
  },
  {
    name: "Clerk",
    provider: "ashby",
    boardToken: "clerk",
    careersUrl: "https://clerk.com/careers",
  },
];

export function getCompanyAllowlist(): CompanyAllowlistEntry[] {
  const fromEnv = process.env.COMPANY_ALLOWLIST_JSON;
  if (fromEnv) {
    try {
      const parsed = JSON.parse(fromEnv) as CompanyAllowlistEntry[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((c) => c.enabled !== false);
      }
    } catch {
      console.error(
        "[allowlist] Failed to parse COMPANY_ALLOWLIST_JSON; using defaults",
      );
    }
  }
  return DEFAULT_COMPANY_ALLOWLIST.filter((c) => c.enabled !== false);
}
