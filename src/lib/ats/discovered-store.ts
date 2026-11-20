import { promises as fs } from "fs";
import path from "path";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/admin";
import type { AtsProvider, CompanyAllowlistEntry } from "./types";

export type BoardProbeStatus = "active" | "empty" | "error";

export interface DiscoveredBoardRecord {
  name: string;
  provider: AtsProvider;
  boardToken: string;
  careersUrl?: string;
  status: BoardProbeStatus;
  designJobsFound: number;
  lastProbedAt: string;
  source: "discovered" | "seed";
}

interface DiscoveredFile {
  version: 1;
  updatedAt: string;
  boards: DiscoveredBoardRecord[];
}

const FILE_PATH = path.join(process.cwd(), "data", "discovered-boards.json");

function emptyFile(): DiscoveredFile {
  return { version: 1, updatedAt: new Date(0).toISOString(), boards: [] };
}

async function readFileStore(): Promise<DiscoveredFile> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    return JSON.parse(raw) as DiscoveredFile;
  } catch {
    return emptyFile();
  }
}

async function writeFileStore(boards: DiscoveredBoardRecord[]): Promise<void> {
  const payload: DiscoveredFile = {
    version: 1,
    updatedAt: new Date().toISOString(),
    boards,
  };
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(payload, null, 2), "utf8");
}

function rowToRecord(row: Record<string, unknown>): DiscoveredBoardRecord {
  return {
    name: String(row.company_name),
    provider: row.provider as AtsProvider,
    boardToken: String(row.board_token),
    careersUrl: (row.careers_url as string) || undefined,
    status: row.status as BoardProbeStatus,
    designJobsFound: Number(row.design_jobs_found ?? 0),
    lastProbedAt: String(row.last_probed_at),
    source: row.source === "seed" ? "seed" : "discovered",
  };
}

async function readSupabaseStore(): Promise<DiscoveredBoardRecord[] | null> {
  const supabase = createServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("company_boards").select("*");
  if (error) {
    // Table may not exist yet — fall back to file without failing refresh.
    console.warn("[discovered] supabase read:", error.message);
    return null;
  }
  return (data ?? []).map((row) => rowToRecord(row as Record<string, unknown>));
}

async function upsertSupabaseStore(
  boards: DiscoveredBoardRecord[],
): Promise<boolean> {
  const supabase = createServiceClient();
  if (!supabase || boards.length === 0) return false;
  const rows = boards.map((b) => ({
    provider: b.provider,
    board_token: b.boardToken,
    company_name: b.name,
    careers_url: b.careersUrl ?? null,
    status: b.status,
    design_jobs_found: b.designJobsFound,
    source: b.source,
    last_probed_at: b.lastProbedAt,
  }));
  const { error } = await supabase.from("company_boards").upsert(rows, {
    onConflict: "provider,board_token",
  });
  if (error) {
    console.warn("[discovered] supabase upsert:", error.message);
    return false;
  }
  return true;
}

function mergeByKey(
  a: DiscoveredBoardRecord[],
  b: DiscoveredBoardRecord[],
): DiscoveredBoardRecord[] {
  const map = new Map<string, DiscoveredBoardRecord>();
  for (const board of [...a, ...b]) {
    const key = `${board.provider}:${board.boardToken}`;
    const prev = map.get(key);
    if (!prev || board.lastProbedAt >= prev.lastProbedAt) {
      map.set(key, board);
    }
  }
  return Array.from(map.values());
}

export async function loadDiscoveredBoards(): Promise<DiscoveredBoardRecord[]> {
  const file = await readFileStore();
  if (isSupabaseConfigured()) {
    const remote = await readSupabaseStore();
    if (remote) return mergeByKey(file.boards, remote);
  }
  return file.boards;
}

export async function saveDiscoveredBoards(
  boards: DiscoveredBoardRecord[],
): Promise<void> {
  await writeFileStore(boards);
  if (isSupabaseConfigured()) {
    await upsertSupabaseStore(boards);
  }
}

export async function upsertDiscoveredBoard(
  record: DiscoveredBoardRecord,
): Promise<DiscoveredBoardRecord[]> {
  const existing = await loadDiscoveredBoards();
  const key = `${record.provider}:${record.boardToken}`;
  const next = existing.filter(
    (b) => `${b.provider}:${b.boardToken}` !== key,
  );
  next.push(record);
  await saveDiscoveredBoards(next);
  return next;
}

export function activeDiscoveredEntries(
  boards: DiscoveredBoardRecord[],
): CompanyAllowlistEntry[] {
  return boards
    .filter((b) => b.status === "active")
    .map((b) => ({
      name: b.name,
      provider: b.provider,
      boardToken: b.boardToken,
      careersUrl: b.careersUrl,
    }));
}

export function probedKeySet(boards: DiscoveredBoardRecord[]): Set<string> {
  return new Set(boards.map((b) => `${b.provider}:${b.boardToken}`));
}

/** Boards still blocked from re-probe (active always; empty/error until TTL). */
export function skipProbeKeySet(
  boards: DiscoveredBoardRecord[],
  emptyTtlMs = 7 * 24 * 60 * 60 * 1000,
): Set<string> {
  const now = Date.now();
  const skip = new Set<string>();
  for (const b of boards) {
    const key = `${b.provider}:${b.boardToken}`;
    if (b.status === "active") {
      skip.add(key);
      continue;
    }
    const probedAt = Date.parse(b.lastProbedAt);
    if (Number.isFinite(probedAt) && now - probedAt < emptyTtlMs) {
      skip.add(key);
    }
  }
  return skip;
}
