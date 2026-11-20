"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { relativeTime } from "@/lib/format";
import {
  fetchApplications,
  removeApplication,
} from "@/lib/tracking/client";
import type { ApplicationRecord } from "@/lib/tracking/types";

export function SavedJobsList() {
  const [rows, setRows] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    const { applications } = await fetchApplications();
    setRows(applications.filter((a) => a.status === "saved"));
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function unsave(row: ApplicationRecord) {
    await removeApplication(row.id, row.job_id);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  if (loading) {
    return (
      <p className="px-4 py-12 text-center text-sm text-ink-soft">Loading…</p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="px-4 py-12 text-center text-sm text-ink-soft">
        No bookmarks yet. Tap the bookmark icon on any role on the board.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--line)]">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="font-medium text-ink">{row.title_snapshot}</p>
            <p className="text-xs text-ink-soft">
              {row.company_snapshot}
              {row.location_snapshot ? ` · ${row.location_snapshot}` : ""}
              {" · "}
              saved {relativeTime(row.updated_at)}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {row.job_id ? (
              <Link
                href={`/jobs/${row.job_id}`}
                className="focus-ring rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-ink-soft"
              >
                Details
              </Link>
            ) : null}
            {row.apply_url ? (
              <a
                href={row.apply_url}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring rounded-full bg-jade px-3 py-1.5 text-xs font-medium text-porcelain"
              >
                Apply
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => unsave(row)}
              className="focus-ring rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-ink-soft hover:border-clay hover:text-clay"
            >
              Remove
            </button>
            <Link
              href="/tracker"
              className="focus-ring rounded-full border border-gold/40 bg-chartreuse/15 px-3 py-1.5 text-xs text-ink"
            >
              Tracker
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
