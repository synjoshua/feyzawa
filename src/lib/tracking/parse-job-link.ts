/** Guess company + title from a pasted apply / careers URL. */

const HOST_COMPANY: Record<string, string> = {
  "stripe.com": "Stripe",
  "figma.com": "Figma",
  "pinterest.com": "Pinterest",
  "duolingo.com": "Duolingo",
  "lyft.com": "Lyft",
  "robinhood.com": "Robinhood",
  "asana.com": "Asana",
  "airbnb.com": "Airbnb",
  "dropbox.com": "Dropbox",
  "discord.com": "Discord",
  "brex.com": "Brex",
  "gusto.com": "Gusto",
  "affirm.com": "Affirm",
  "chime.com": "Chime",
  "reddit.com": "Reddit",
  "datadoghq.com": "Datadog",
  "twilio.com": "Twilio",
  "box.com": "Box",
  "airtable.com": "Airtable",
  "coinbase.com": "Coinbase",
  "palantir.com": "Palantir",
  "spotify.com": "Spotify",
  "notion.so": "Notion",
  "notion.com": "Notion",
  "linear.app": "Linear",
  "ramp.com": "Ramp",
  "openai.com": "OpenAI",
  "replit.com": "Replit",
  "cursor.com": "Cursor",
  "perplexity.ai": "Perplexity",
  "watershed.com": "Watershed",
  "benchling.com": "Benchling",
  "clerk.com": "Clerk",
  "greenhouse.io": "",
  "lever.co": "",
  "ashbyhq.com": "",
  "boards.greenhouse.io": "",
  "jobs.lever.co": "",
  "jobs.ashbyhq.com": "",
};

function titleCase(slug: string): string {
  return slug
    .replace(/[-_+/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function parseJobLink(raw: string): {
  url: string;
  company: string;
  title: string;
} | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  let company = HOST_COMPANY[host] ?? "";

  // Greenhouse: boards.greenhouse.io/{token}/jobs/{id}
  const gh = host.match(/^(?:boards\.)?greenhouse\.io$/);
  if (gh) {
    const parts = url.pathname.split("/").filter(Boolean);
    const token = parts[0] ?? "";
    company = company || titleCase(token);
  }

  // Lever: jobs.lever.co/{token}/...
  if (host.includes("lever.co")) {
    const parts = url.pathname.split("/").filter(Boolean);
    company = company || titleCase(parts[0] ?? "");
  }

  // Ashby: jobs.ashbyhq.com/{token}/...
  if (host.includes("ashbyhq.com")) {
    const parts = url.pathname.split("/").filter(Boolean);
    company = company || titleCase(parts[0] ?? "");
  }

  if (!company) {
    const base = host.split(".")[0] ?? "Company";
    company = titleCase(base);
  }

  // Prefer last meaningful path segment as title guess
  const segments = url.pathname
    .split("/")
    .filter((s) => s && !/^\d+$/.test(s) && s.toLowerCase() !== "jobs");
  const last = segments[segments.length - 1] ?? "";
  const title =
    last && last.toLowerCase() !== company.toLowerCase().replace(/\s+/g, "")
      ? titleCase(decodeURIComponent(last))
      : `Role at ${company}`;

  return { url: url.toString(), company, title };
}
