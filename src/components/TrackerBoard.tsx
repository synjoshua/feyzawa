"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { relativeTime } from "@/lib/format";
import {
  fetchApplications,
  patchApplication,
  removeApplication,
  trackApplication,
} from "@/lib/tracking/client";
import type { ApplicationRecord, ApplicationStatus } from "@/lib/tracking/types";

export type ApplicationRow = ApplicationRecord;

const STATUSES: ApplicationStatus[] = [
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
  initial: ApplicationRecord[];
  configured: boolean;
}) {
  const [rows, setRows] = useState<ApplicationRecord[]>(initial);
  const [mode, setMode] = useState<"supabase" | "local">(
    configured ? "supabase" : "local",
  );
  const [error, setError] = useState("");
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchApplications();
      if (cancelled) return;
      if (result.mode === "supabase" || result.applications.length > 0) {
        setRows(result.applications);
        setMode(result.mode);
      } else if (initial.length === 0) {
        setRows(result.applications);
        setMode(result.mode);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial]);

  const grouped = useMemo(() => {
    const map: Record<ApplicationStatus, ApplicationRecord[]> = {
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

  async function updateStatus(id: string, status: ApplicationStatus) {
    setError("");
    const result = await patchApplication(id, { status });
    if (!result) {
      setError("Update failed");
      return;
    }
    setMode(result.mode);
    setRows((prev) =>
      prev.map((r) => (r.id === id ? result.application : r)),
    );
  }

  async function updateNotes(id: string, notes: string) {
    setError("");
    const result = await patchApplication(id, { notes });
    if (!result) {
      setError("Could not save notes");
      return;
    }
    setMode(result.mode);
    setRows((prev) =>
      prev.map((r) => (r.id === id ? result.application : r)),
    );
  }

  async function remove(id: string) {
    const ok = await removeApplication(id);
    if (!ok) {
      setError("Delete failed");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function onManual(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    const company = String(fd.get("company") ?? "").trim();
    if (!title || !company) {
      setError("Title and company are required");
      return;
    }
    const result = await trackApplication({
      title,
      company,
      applyUrl: String(fd.get("applyUrl") ?? "").trim() || null,
      location: String(fd.get("location") ?? "").trim() || null,
      status: String(fd.get("status") ?? "applied") as ApplicationStatus,
      notes: String(fd.get("notes") ?? "").trim(),
    });
    setMode(result.mode);
    setRows((prev) => [result.application, ...prev]);
    e.currentTarget.reset();
    setShowManual(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-soft">
          Storage:{" "}
          <span className="font-medium text-ink">
            {mode === "local" ? "this device (local)" : "Supabase (private)"}
          </span>
          {mode === "local" && configured
            ? " — sign in to sync"
            : mode === "local"
              ? " — works without Supabase; set up keys to sync"
              : ""}
        </p>
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="focus-ring rounded-full bg-jade px-4 py-2 text-sm font-medium text-porcelain"
        >
          {showManual ? "Close" : "Add application"}
        </button>
      </div>

      {showManual ? (
        <form
          onSubmit={onManual}
          className="tea-surface grid gap-3 rounded-tea p-4 sm:grid-cols-2"
        >
          <p className="sm:col-span-2 text-sm text-ink-soft">
            Tell Feyzawa about a role you already applied to (on or off the
            board).
          </p>
          <label className="text-sm">
            <span className="text-ink-soft">Title</span>
            <input
              name="title"
              required
              className="focus-ring mt-1 w-full rounded-full border border-[var(--line)] bg-porcelain px-3 py-2"
              placeholder="Product Design Intern"
            />
          </label>
          <label className="text-sm">
            <span className="text-ink-soft">Company</span>
            <input
              name="company"
              required
              className="focus-ring mt-1 w-full rounded-full border border-[var(--line)] bg-porcelain px-3 py-2"
              placeholder="Figma"
            />
          </label>
          <label className="text-sm">
            <span className="text-ink-soft">Apply URL</span>
            <input
              name="applyUrl"
              type="url"
              className="focus-ring mt-1 w-full rounded-full border border-[var(--line)] bg-porcelain px-3 py-2"
              placeholder="https://…"
            />
          </label>
          <label className="text-sm">
            <span className="text-ink-soft">Location</span>
            <input
              name="location"
              className="focus-ring mt-1 w-full rounded-full border border-[var(--line)] bg-porcelain px-3 py-2"
              placeholder="San Francisco, CA"
            />
          </label>
          <label className="text-sm">
            <span className="text-ink-soft">Status</span>
            <select
              name="status"
              defaultValue="applied"
              className="focus-ring mt-1 w-full rounded-full border border-[var(--line)] bg-porcelain px-3 py-2"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-ink-soft">Private notes</span>
            <textarea
              name="notes"
              rows={2}
              className="focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-porcelain px-3 py-2"
              placeholder="Date applied, referral, etc."
            />
          </label>
          <button
            type="submit"
            className="focus-ring sm:col-span-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-porcelain"
          >
            Add to tracker
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay">{error}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        {STATUSES.map((status) => (
          <section key={status} className="tea-surface rounded-tea p-3">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
              {status} · {grouped[status].length}
            </h2>
            <ul className="space-y-3">
              {grouped[status].map((row) => (
                <li
                  key={row.id}
                  className="rounded-xl border border-[var(--line)] bg-porcelain p-3"
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
                          e.target.value as ApplicationStatus,
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
                  <div className="mt-2 flex flex-wrap items-center gap-2">
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
                    <a
                      href={`/outreach?company=${encodeURIComponent(row.company_snapshot)}&role=${encodeURIComponent(row.title_snapshot)}`}
                      className="text-xs text-gold underline"
                    >
                      Recruiters
                    </a>
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
