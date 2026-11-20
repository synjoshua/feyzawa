import { getCompanyAllowlist } from "./allowlist";

/** Prefer real product domains over careers subdomains for logo lookups. */
const DOMAIN_OVERRIDES: Record<string, string> = {
  Stripe: "stripe.com",
  Figma: "figma.com",
  Pinterest: "pinterest.com",
  Duolingo: "duolingo.com",
  Lyft: "lyft.com",
  Robinhood: "robinhood.com",
  Asana: "asana.com",
  Airbnb: "airbnb.com",
  Dropbox: "dropbox.com",
  Discord: "discord.com",
  Brex: "brex.com",
  Gusto: "gusto.com",
  Affirm: "affirm.com",
  Chime: "chime.com",
  Reddit: "reddit.com",
  Datadog: "datadoghq.com",
  Twilio: "twilio.com",
  Box: "box.com",
  Airtable: "airtable.com",
  Coinbase: "coinbase.com",
  Palantir: "palantir.com",
  Spotify: "spotify.com",
  Notion: "notion.so",
  Linear: "linear.app",
  Ramp: "ramp.com",
  OpenAI: "openai.com",
  Replit: "replit.com",
  Cursor: "cursor.com",
  Perplexity: "perplexity.ai",
  Watershed: "watershed.com",
  Benchling: "benchling.com",
  Clerk: "clerk.com",
};

function hostnameFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function buildDomainMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const [name, domain] of Object.entries(DOMAIN_OVERRIDES)) {
    map.set(name.toLowerCase(), domain);
  }
  for (const company of getCompanyAllowlist()) {
    const key = company.name.toLowerCase();
    if (map.has(key)) continue;
    const host = hostnameFromUrl(company.careersUrl);
    if (host) map.set(key, host);
  }
  return map;
}

const DOMAIN_BY_COMPANY = buildDomainMap();

export function companyDomain(companyName: string): string | null {
  return DOMAIN_BY_COMPANY.get(companyName.trim().toLowerCase()) ?? null;
}

/** High-res favicon via Google — no API key, good enough for list scanning. */
export function companyLogoUrl(companyName: string): string | null {
  const domain = companyDomain(companyName);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

export function companyInitials(companyName: string): string {
  const parts = companyName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}
