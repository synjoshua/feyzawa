"use client";

import { useMemo, useState } from "react";
import { relativeTime } from "@/lib/format";

export type ApplicationRow = {
  id: string;
  title_snapshot: string;
  company_snapshot: string;
  apply_url: string | null;
  location_snapshot: string | null;
  status: "saved" | "applied" | "interviewing" | "offer" | "rejected";
  notes: string | null;
  applied_at: string | null;
  updated_at: string;
};

const STATUSES: ApplicationRow["status"][] = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
];

export function TrackerBoard({
  initial,
  configured,
}: {
  initial: ApplicationRow[];
  configured: boolean;
}) {
  const [rows, setRows] = useState(initial);
  const [error, setError] = useState("");

  const grouped = useMemo(() => {
    const map: Record<string, ApplicationRow[]> = {
      saved: [],
      applied: [],
      interviewing: [],
      offer: [],
      rejected: [],
    };
    for (const row of rows) {
      map[row.status]?.push(row);
    }
    return map;
  }, [rows]);

  async function updateStatus(id: string, status: ApplicationRow["status"]) {
    setError("");
    const res = await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Update failed");
      return;
    }
    const data = await res.json();
    setRows((prev) =>
      prev.map((r) => (r.id === id ? (data.application as ApplicationRow) : r)),
    );
  }

  async function updateNotes(id: string, notes: string) {
    setError("");
    const res = await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, notes }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not save notes");
      return;
    }
    const data = await res.json();
    setRows((prev) =>
      prev.map((r) => (r.id === id ? (data.application as ApplicationRow) : r)),
    );
  }

  async function remove(id: string) {
    const res = await fetch(`/api/applications?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Delete failed");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  if (!configured) {
    return (
      <div className="tea-surface rounded-tea p-6 text-sm text-ink-soft">
        Supabase is not configured yet. Create a project, run{" "}
        <code className="rounded bg-foam px-1">supabase/schema.sql</code>,
        and set the env vars documented in setup. Tracking stays private once
        auth is live.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay">{error}</p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-5">
        {STATUSES.map((status) => (
          <section
            key={status}
            className="tea-surface rounded-tea p-3"
          >
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
              {status} · {grouped[status].length}
            </h2>
            <ul className="space-y-3">
              {grouped[status].map((row) => (
                <li
                  key={row.id}
                  className="rounded-xl border border-[var(--line)] bg-white/80 p-3"
                >
                  <p className="text-sm font-semibold text-ink">
                    {row.title_snapshot}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {row.company_snapshot}
                    {row.location_snapshot ? ` · ${row.location_snapshot}` : ""}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-soft/70">
                    Updated {relativeTime(row.updated_at)}
                  </p>
                  <label className="mt-2 block">
                    <span className="sr-only">Status</span>
                    <select
                      value={row.status}
                      onChange={(e) =>
                        updateStatus(
                          row.id,
                          e.target.value as ApplicationRow["status"],
                        )
                      }
                      className="focus-ring w-full rounded-md border border-[var(--line)] bg-white px-2 py-1 text-xs"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="mt-2 block">
                    <span className="text-[10px] uppercase tracking-wide text-ink-soft/70">
                      Private notes
                    </span>
                    <textarea
                      defaultValue={row.notes ?? ""}
                      onBlur={(e) => {
                        if (e.target.value !== (row.notes ?? "")) {
                          updateNotes(row.id, e.target.value);
                        }
                      }}
                      rows={3}
                      className="focus-ring mt-1 w-full rounded-md border border-[var(--line)] bg-white px-2 py-1 text-xs"
                      placeholder="Interview notes stay private…"
                    />
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    {row.apply_url ? (
                      <a
                        href={row.apply_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gold underline"
                      >
                        Apply link
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => remove(row.id)}
                      className="ml-auto text-xs text-clay hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
              {grouped[status].length === 0 ? (
                <li className="px-1 py-6 text-center text-xs text-ink-soft/70">
                  Empty
                </li>
              ) : null}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
