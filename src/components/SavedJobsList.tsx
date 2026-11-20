"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { relativeTime } from "@/lib/format";
import {
  fetchApplications,
  removeApplication,
} from "@/lib/tracking/client";
import type { ApplicationRecord } from "@/lib/tracking/types";

type Tab = "saved" | "not_interested";

export function SavedJobsList() {
  const [all, setAll] = useState<ApplicationRecord[]>([]);
  const [tab, setTab] = useState<Tab>("saved");
  const [loading, setLoading] = useState(true);

  async function reload() {
    const { applications } = await fetchApplications();
    setAll(
      applications.filter(
        (a) => a.status === "saved" || a.status === "not_interested",
      ),
    );
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  const savedCount = useMemo(
    () => all.filter((a) => a.status === "saved").length,
    [all],
  );
  const skippedCount = useMemo(
    () => all.filter((a) => a.status === "not_interested").length,
    [all],
  );

  const rows = useMemo(
    () => all.filter((a) => a.status === tab),
    [all, tab],
  );

  async function remove(row: ApplicationRecord) {
    await removeApplication(row.id, row.job_id);
    setAll((prev) => prev.filter((r) => r.id !== row.id));
  }

  if (loading) {
    return (
      <p className="px-4 py-12 text-center text-sm text-ink-soft">Loading…</p>
    );
  }

  return (
    <div>
      <div className="flex gap-1 border-b border-[var(--line)] px-3 pt-3 sm:px-4">
        <TabButton
          active={tab === "saved"}
          onClick={() => setTab("saved")}
          label="Saved"
          count={savedCount}
        />
        <TabButton
          active={tab === "not_interested"}
          onClick={() => setTab("not_interested")}
          label="Not interested"
          count={skippedCount}
        />
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-ink-soft">
          {tab === "saved"
            ? "No bookmarks yet. Tap the bookmark icon on any role on the board."
            : "Nothing marked not interested yet. Those roles leave Open roles completely — tap Add back here to restore them."}
        </p>
      ) : (
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
                  {tab === "saved" ? "saved" : "skipped"}{" "}
                  {relativeTime(row.updated_at)}
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
                {tab === "saved" && row.apply_url ? (
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
                  onClick={() => remove(row)}
                  className={`focus-ring rounded-full border px-3 py-1.5 text-xs ${
                    tab === "not_interested"
                      ? "border-gold/40 bg-chartreuse/15 font-medium text-ink hover:border-gold"
                      : "border-[var(--line)] text-ink-soft hover:border-clay hover:text-clay"
                  }`}
                >
                  {tab === "saved" ? "Remove" : "Add back"}
                </button>
                {tab === "saved" ? (
                  <Link
                    href="/tracker"
                    className="focus-ring rounded-full border border-gold/40 bg-chartreuse/15 px-3 py-1.5 text-xs text-ink"
                  >
                    Tracker
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`focus-ring -mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "border-ink text-ink"
          : "border-transparent text-ink-soft hover:text-ink"
      }`}
    >
      {label}
      <span
        className={`ml-1.5 text-xs tabular-nums ${
          active ? "text-ink-soft" : "text-ink-soft/70"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
