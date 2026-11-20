"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { relativeTime } from "@/lib/format";
import {
  fetchApplications,
  patchApplication,
  removeApplication,
  trackApplication,
} from "@/lib/tracking/client";
import { parseJobLink } from "@/lib/tracking/parse-job-link";
import type { ApplicationRecord, ApplicationStatus } from "@/lib/tracking/types";

export type ApplicationRow = ApplicationRecord;

const STATUSES: ApplicationStatus[] = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
];

const STATUS_META: Record<
  ApplicationStatus,
  { label: string; className: string }
> = {
  saved: {
    label: "Saved",
    className: "border-[#d4c4b0] bg-[#f2e8de] text-ink-soft",
  },
  applied: {
    label: "Applied",
    className: "border-[#2c2827]/20 bg-[#2c2827] text-porcelain",
  },
  interviewing: {
    label: "Interviewing",
    className: "border-gold/50 bg-[#e5bf55]/35 text-[#5c4810]",
  },
  offer: {
    label: "Accepted",
    className: "border-[#6b8f71]/40 bg-[#d8e8d4] text-[#2f4a34]",
  },
  rejected: {
    label: "Rejected",
    className: "border-clay/30 bg-clay/15 text-clay",
  },
};

/** Quick statuses for paste-link import (Accepted → offer). */
const PASTE_STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "offer", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

function cleanNotes(notes: string | null | undefined): string {
  if (!notes) return "";
  return notes
    .split("\n")
    .filter((line) => !line.trim().startsWith("board_job_id:"))
    .join("\n")
    .trim();
}

function StatusPill({
  value,
  onChange,
}: {
  value: ApplicationStatus;
  onChange: (next: ApplicationStatus) => void;
}) {
  const meta = STATUS_META[value];
  return (
    <label className="relative inline-flex">
      <span className="sr-only">Status</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ApplicationStatus)}
        className={`focus-ring appearance-none rounded-full border py-1 pl-2.5 pr-7 text-[11px] font-semibold tracking-wide ${meta.className}`}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_META[s].label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 12 12"
        className="pointer-events-none absolute right-2 top-1/2 h-2.5 w-2.5 -translate-y-1/2 opacity-70"
        aria-hidden
      >
        <path
          d="M2.5 4.25 6 7.75l3.5-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </label>
  );
}

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
  const [filter, setFilter] = useState<ApplicationStatus | "all">("all");
  const [pasteUrl, setPasteUrl] = useState("");
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteCompany, setPasteCompany] = useState("");
  const [pasteStatus, setPasteStatus] =
    useState<ApplicationStatus>("applied");
  const [pasteBusy, setPasteBusy] = useState(false);
  const [pasteHint, setPasteHint] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchApplications();
      if (cancelled) return;
      setRows(result.applications);
      setMode(result.mode);
    })();
    return () => {
      cancelled = true;
    };
  }, [initial]);

  const counts = useMemo(() => {
    const map: Record<ApplicationStatus, number> = {
      saved: 0,
      applied: 0,
      interviewing: 0,
      offer: 0,
      rejected: 0,
    };
    for (const row of rows) map[row.status] = (map[row.status] ?? 0) + 1;
    return map;
  }, [rows]);

  const visible = useMemo(() => {
    const list =
      filter === "all" ? rows : rows.filter((r) => r.status === filter);
    return [...list].sort(
      (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at),
    );
  }, [rows, filter]);

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

  function onPasteUrlChange(value: string) {
    setPasteUrl(value);
    setPasteHint("");
    const parsed = parseJobLink(value);
    if (!parsed) {
      setPasteTitle("");
      setPasteCompany("");
      return;
    }
    setPasteCompany(parsed.company);
    setPasteTitle(parsed.title);
    void (async () => {
      try {
        const res = await fetch("/api/jobs?status=all");
        if (!res.ok) return;
        const data = await res.json();
        const jobs = (data.jobs ?? []) as Array<{
          id: string;
          title: string;
          companyName: string;
          applyUrl: string;
          locationText: string;
        }>;
        const needle = parsed.url.replace(/\/$/, "").toLowerCase();
        const match = jobs.find((j) => {
          const u = (j.applyUrl || "").replace(/\/$/, "").toLowerCase();
          return u === needle || u.includes(needle) || needle.includes(u);
        });
        if (match) {
          setPasteTitle(match.title);
          setPasteCompany(match.companyName);
          setPasteHint(`Matched board role: ${match.companyName}`);
        }
      } catch {
        // keep parsed guess
      }
    })();
  }

  async function onPasteSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPasteBusy(true);
    try {
      const parsed = parseJobLink(pasteUrl);
      if (!parsed) {
        setError("Paste a valid job or apply link");
        return;
      }
      const title = pasteTitle.trim() || parsed.title;
      const company = pasteCompany.trim() || parsed.company;
      if (!title || !company) {
        setError("Add a title and company");
        return;
      }
      let jobId: string | null = null;
      let location: string | null = null;
      try {
        const res = await fetch("/api/jobs?status=all");
        if (res.ok) {
          const data = await res.json();
          const jobs = (data.jobs ?? []) as Array<{
            id: string;
            title: string;
            companyName: string;
            applyUrl: string;
            locationText: string;
          }>;
          const needle = parsed.url.replace(/\/$/, "").toLowerCase();
          const match = jobs.find((j) => {
            const u = (j.applyUrl || "").replace(/\/$/, "").toLowerCase();
            return u === needle || u.includes(needle) || needle.includes(u);
          });
          if (match) {
            jobId = match.id;
            location = match.locationText || null;
          }
        }
      } catch {
        // offline board match optional
      }

      const result = await trackApplication({
        jobId,
        title,
        company,
        applyUrl: parsed.url,
        location,
        status: pasteStatus,
      });
      setMode(result.mode);
      setRows((prev) => [result.application, ...prev]);
      setPasteUrl("");
      setPasteTitle("");
      setPasteCompany("");
      setPasteStatus("applied");
      setPasteHint("Added to tracker");
    } finally {
      setPasteBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={onPasteSubmit}
        className="tea-surface space-y-3 rounded-tea p-4"
      >
        <div>
          <p className="text-sm font-medium text-ink">Paste a job link</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            Drop an apply / careers URL, confirm the name, pick status, add.
          </p>
        </div>
        <label className="block text-sm">
          <span className="text-ink-soft">Link</span>
          <input
            type="url"
            value={pasteUrl}
            onChange={(e) => onPasteUrlChange(e.target.value)}
            className="focus-ring mt-1 w-full rounded-full border border-[var(--line)] bg-porcelain px-3 py-2.5"
            placeholder="https://boards.greenhouse.io/… or company careers link"
            required
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-ink-soft">Title</span>
            <input
              value={pasteTitle}
              onChange={(e) => setPasteTitle(e.target.value)}
              className="focus-ring mt-1 w-full rounded-full border border-[var(--line)] bg-porcelain px-3 py-2"
              placeholder="Product Design Intern"
              required
            />
          </label>
          <label className="text-sm">
            <span className="text-ink-soft">Company</span>
            <input
              value={pasteCompany}
              onChange={(e) => setPasteCompany(e.target.value)}
              className="focus-ring mt-1 w-full rounded-full border border-[var(--line)] bg-porcelain px-3 py-2"
              placeholder="Figma"
              required
            />
          </label>
        </div>
        <fieldset>
          <legend className="text-sm text-ink-soft">Status</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {PASTE_STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setPasteStatus(s.value)}
                className={`focus-ring rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  pasteStatus === s.value
                    ? STATUS_META[s.value].className
                    : "border-[var(--line)] bg-porcelain text-ink-soft hover:border-gold"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pasteBusy}
            className="focus-ring rounded-full bg-jade px-4 py-2.5 text-sm font-medium text-porcelain disabled:opacity-60"
          >
            {pasteBusy ? "Adding…" : "Add to tracker"}
          </button>
          {pasteHint ? (
            <span className="text-xs text-ink-soft">{pasteHint}</span>
          ) : null}
        </div>
      </form>

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
          {" · "}
          {rows.length} roles
        </p>
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="focus-ring rounded-full border border-[var(--line)] bg-porcelain px-4 py-2 text-sm font-medium text-ink hover:border-gold"
        >
          {showManual ? "Close" : "Add without link"}
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
                  {STATUS_META[s].label}
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
        <p className="rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`focus-ring rounded-full px-3 py-1 text-xs font-medium transition ${
            filter === "all"
              ? "bg-jade text-porcelain"
              : "border border-[var(--line)] bg-porcelain text-ink-soft hover:border-gold"
          }`}
        >
          All · {rows.length}
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`focus-ring rounded-full border px-3 py-1 text-xs font-semibold transition ${
              filter === s
                ? STATUS_META[s].className
                : "border-[var(--line)] bg-porcelain text-ink-soft hover:border-gold"
            }`}
          >
            {STATUS_META[s].label} · {counts[s]}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-porcelain shadow-soft">
        <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[#f2e8de]/70 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
              <th className="px-3 py-2.5 font-semibold">Role</th>
              <th className="px-3 py-2.5 font-semibold">Company</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
              <th className="px-3 py-2.5 font-semibold">Notes</th>
              <th className="px-3 py-2.5 font-semibold">Updated</th>
              <th className="px-3 py-2.5 font-semibold"> </th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-10 text-center text-sm text-ink-soft"
                >
                  No roles here yet — paste a link or mark applied from the
                  board.
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--line)] last:border-b-0 hover:bg-[#f2e8de]/35"
                >
                  <td className="max-w-[14rem] px-3 py-2 align-middle">
                    <p className="truncate font-medium text-ink">
                      {row.title_snapshot}
                    </p>
                    {row.location_snapshot ? (
                      <p className="truncate text-[11px] text-ink-soft">
                        {row.location_snapshot}
                      </p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 align-middle text-ink-soft">
                    {row.company_snapshot}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <StatusPill
                      value={row.status}
                      onChange={(status) => updateStatus(row.id, status)}
                    />
                  </td>
                  <td className="min-w-[12rem] px-3 py-2 align-middle">
                    <input
                      defaultValue={cleanNotes(row.notes)}
                      key={`${row.id}-${row.updated_at}`}
                      onBlur={(e) => {
                        const next = e.target.value.trim();
                        const prev = cleanNotes(row.notes);
                        if (next === prev) return;
                        // Preserve internal board_job_id line if present
                        const boardLine = (row.notes ?? "")
                          .split("\n")
                          .find((l) => l.trim().startsWith("board_job_id:"));
                        const merged = [next, boardLine].filter(Boolean).join("\n");
                        updateNotes(row.id, merged);
                      }}
                      placeholder="Add note…"
                      className="focus-ring w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs text-ink placeholder:text-ink-soft/50 hover:border-[var(--line)] focus:border-[var(--line)] focus:bg-white"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 align-middle text-[11px] text-ink-soft">
                    {relativeTime(row.updated_at)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 align-middle">
                    <div className="flex items-center justify-end gap-2">
                      {row.apply_url ? (
                        <a
                          href={row.apply_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gold hover:underline"
                        >
                          Link
                        </a>
                      ) : null}
                      <a
                        href={`/outreach?company=${encodeURIComponent(row.company_snapshot)}&role=${encodeURIComponent(row.title_snapshot)}`}
                        className="text-xs text-gold hover:underline"
                      >
                        Recruiters
                      </a>
                      <button
                        type="button"
                        onClick={() => remove(row.id)}
                        className="text-xs text-clay hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
