/**
 * Merge public ATS board directories into data/ats-candidates.json.
 * Safe to re-run; keeps existing entries and prefer richer names.
 *
 * Usage: npx tsx scripts/ingest-ats-directories.ts
 */
import { promises as fs } from "fs";
import path from "path";
import {
  candidateKey,
  type AtsCandidate,
} from "../src/lib/ats/candidates";
import { loadRemoteAtsDirectories } from "../src/lib/ats/candidate-directories";

const CANDIDATES_PATH = path.join(
  process.cwd(),
  "data",
  "ats-candidates.json",
);

async function main() {
  let existing: AtsCandidate[] = [];
  try {
    const raw = await fs.readFile(CANDIDATES_PATH, "utf8");
    existing = (JSON.parse(raw) as { candidates?: AtsCandidate[] }).candidates ?? [];
  } catch {
    existing = [];
  }

  const remote = await loadRemoteAtsDirectories({ force: true });
  const merged = new Map<string, AtsCandidate>();
  for (const c of [...existing, ...remote]) {
    merged.set(candidateKey(c), c);
  }
  const candidates = Array.from(merged.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  await fs.writeFile(
    CANDIDATES_PATH,
    `${JSON.stringify({ version: 1, candidates }, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Wrote ${candidates.length} candidates (was ${existing.length}, remote ${remote.length})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
