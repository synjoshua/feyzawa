import { promises as fs } from "fs";
import path from "path";
import type { AtsProvider, CompanyAllowlistEntry } from "./types";

export interface AtsCandidate {
  name: string;
  provider: AtsProvider;
  boardToken: string;
  careersUrl?: string;
}

interface CandidatesFile {
  version: 1;
  candidates: AtsCandidate[];
}

const CANDIDATES_PATH = path.join(process.cwd(), "data", "ats-candidates.json");

let cached: AtsCandidate[] | null = null;

export async function loadAtsCandidates(): Promise<AtsCandidate[]> {
  if (cached) return cached;
  try {
    const raw = await fs.readFile(CANDIDATES_PATH, "utf8");
    const parsed = JSON.parse(raw) as CandidatesFile;
    cached = (parsed.candidates ?? []).filter(
      (c) =>
        c?.name &&
        c?.boardToken &&
        (c.provider === "greenhouse" ||
          c.provider === "lever" ||
          c.provider === "ashby"),
    );
    return cached;
  } catch (err) {
    console.error("[candidates] failed to load ats-candidates.json", err);
    return [];
  }
}

export function candidateKey(c: {
  provider: string;
  boardToken: string;
}): string {
  return `${c.provider}:${c.boardToken}`;
}

export function candidateToEntry(c: AtsCandidate): CompanyAllowlistEntry {
  return {
    name: c.name,
    provider: c.provider,
    boardToken: c.boardToken,
    careersUrl: c.careersUrl,
  };
}
