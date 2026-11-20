import type { AtsProvider } from "./types";

export interface DirectoryCandidate {
  name: string;
  provider: AtsProvider;
  boardToken: string;
  careersUrl?: string;
}

function candidateKey(c: { provider: string; boardToken: string }): string {
  return `${c.provider}:${c.boardToken}`;
}

const DATAKIT_URL =
  "https://raw.githubusercontent.com/datakit457/ats-company-slugs/main/data/boards.json";
const MOONIE_URL =
  "https://raw.githubusercontent.com/moonie0201/ats-directory/main/companies.jsonl";

const SUPPORTED = new Set<AtsProvider>(["ashby", "greenhouse", "lever"]);

function titleFromSlug(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function asProvider(value: string): AtsProvider | null {
  const v = value.toLowerCase();
  if (v === "ashby" || v === "greenhouse" || v === "lever") return v;
  return null;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "feyzawa-board-ingest/1.0" },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (err) {
    console.warn("[candidate-directories] fetch failed", url, err);
    return null;
  }
}

function fromDatakit(raw: string): DirectoryCandidate[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: DirectoryCandidate[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (r.board_ok === false) continue;
    const provider = asProvider(String(r.ats ?? ""));
    const boardToken = String(r.slug ?? "").trim();
    if (!provider || !boardToken) continue;
    const name = String(r.company ?? "").trim() || titleFromSlug(boardToken);
    out.push({ name, provider, boardToken });
  }
  return out;
}

function fromMoonie(raw: string): DirectoryCandidate[] {
  const out: DirectoryCandidate[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let row: Record<string, unknown>;
    try {
      row = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (row.status && row.status !== "ok") continue;
    const provider = asProvider(String(row.provider ?? ""));
    const boardToken = String(row.slug ?? "").trim();
    if (!provider || !boardToken) continue;
    const name =
      (typeof row.name === "string" && row.name.trim()) ||
      titleFromSlug(boardToken);
    out.push({ name, provider, boardToken });
  }
  return out;
}

let remoteCache: DirectoryCandidate[] | null = null;
let remoteFetchedAt = 0;
const REMOTE_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Pull verified public Ashby/Greenhouse/Lever board directories so discovery
 * does not depend on hand-curated candidate lists (Baseten-class misses).
 */
export async function loadRemoteAtsDirectories(options?: {
  force?: boolean;
}): Promise<DirectoryCandidate[]> {
  const now = Date.now();
  if (
    !options?.force &&
    remoteCache &&
    now - remoteFetchedAt < REMOTE_TTL_MS
  ) {
    return remoteCache;
  }

  const [datakitRaw, moonieRaw] = await Promise.all([
    fetchText(DATAKIT_URL),
    fetchText(MOONIE_URL),
  ]);

  const merged = new Map<string, DirectoryCandidate>();
  for (const c of [
    ...(datakitRaw ? fromDatakit(datakitRaw) : []),
    ...(moonieRaw ? fromMoonie(moonieRaw) : []),
  ]) {
    if (!SUPPORTED.has(c.provider)) continue;
    const key = candidateKey(c);
    const prev = merged.get(key);
    // Prefer a real company name over a slug title-case
    if (!prev || (c.name && c.name !== titleFromSlug(c.boardToken))) {
      merged.set(key, c);
    }
  }

  remoteCache = Array.from(merged.values());
  remoteFetchedAt = now;
  console.log(
    `[candidate-directories] loaded ${remoteCache.length} remote boards`,
  );
  return remoteCache;
}
