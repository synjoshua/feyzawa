"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import type { NormalizedJob } from "@/lib/ats/types";
import { relativeTime } from "@/lib/format";
import {
  EligibilityBadge,
  ExperienceBadge,
  StatusBadge,
  WorkStyleBadge,
} from "./Badges";

type Props = {
  initialJobs: NormalizedJob[];
  updatedAt: string | null;
  source: string;
  companies: string[];
  watchedCompanies: string[];
};

type QuickKey =
  | "all"
  | "intern"
  | "new_grad"
  | "junior"
  | "confirmed"
  | "california"
  | "remote"
  | "product"
  | "ux";

const CATEGORY_CHIPS: { key: QuickKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "intern", label: "Intern" },
  { key: "new_grad", label: "New grad" },
  { key: "junior", label: "Junior" },
  { key: "confirmed", label: "Confirmed" },
  { key: "california", label: "California" },
  { key: "remote", label: "Remote" },
  { key: "product", label: "Product" },
  { key: "ux", label: "UX / UI" },
];

export function DenseHome({
  initialJobs,
  updatedAt,
  source,
  companies,
  watchedCompanies,
}: Props) {
  const [q, setQ] = useState("");
  const [chip, setChip] = useState<QuickKey>("all");
  const [company, setCompany] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [pending, startTransition] = useTransition();

  const activeJobs = useMemo(
    () => initialJobs.filter((j) => j.status === "active"),
    [initialJobs],
  );

  const companyCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const job of activeJobs) {
      map.set(job.companyName, (map.get(job.companyName) ?? 0) + 1);
    }
    return map;
  }, [activeJobs]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return initialJobs.filter((job) => {
      if (!showClosed && job.status !== "active") return false;
      if (query) {
        const hay =
          `${job.title} ${job.companyName} ${job.locationText}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      if (company && job.companyName !== company) return false;

      switch (chip) {
        case "intern":
          return job.isInternship || job.experienceBand === "intern";
        case "new_grad":
          return job.experienceBand === "new_grad";
        case "junior":
          return (
            job.experienceBand === "junior" ||
            job.experienceBand === "associate"
          );
        case "confirmed":
          return job.eligibility === "confirmed";
        case "california":
          return job.isCalifornia;
        case "remote":
          return job.isRemote;
        case "product":
          return /product/i.test(job.title);
        case "ux":
          return /\bux\b|\bui\b|interaction|experience designer/i.test(
            job.title,
          );
        default:
          return true;
      }
    });
  }, [initialJobs, q, chip, company, showClosed]);

  const featured = filtered.slice(0, 8);
  const internCount = activeJobs.filter((j) => j.isInternship).length;
  const caCount = activeJobs.filter((j) => j.isCalifornia).length;
  const remoteCount = activeJobs.filter((j) => j.isRemote).length;
  const confirmedCount = activeJobs.filter(
    (j) => j.eligibility === "confirmed",
  ).length;

  function applyQuick(next: QuickKey) {
    startTransition(() => setChip(next));
  }

  function runSearch(e: FormEvent) {
    e.preventDefault();
    document.getElementById("open-roles")?.scrollIntoView({ behavior: "smooth" });
  }

  const shortcuts = [
    {
      label: "Internships",
      sub: `${internCount}`,
      onClick: () => applyQuick("intern"),
    },
    {
      label: "California",
      sub: `${caCount}`,
      onClick: () => applyQuick("california"),
    },
    {
      label: "Remote",
      sub: `${remoteCount}`,
      onClick: () => applyQuick("remote"),
    },
    {
      label: "Tracker",
      sub: "Apply",
      href: "/tracker",
    },
  ] as const;

  const gridTiles = [
    { label: "Confirmed", key: "confirmed" as QuickKey, count: confirmedCount },
    { label: "New grad", key: "new_grad" as QuickKey, count: activeJobs.filter((j) => j.experienceBand === "new_grad").length },
    { label: "Product", key: "product" as QuickKey, count: activeJobs.filter((j) => /product/i.test(j.title)).length },
    { label: "UX / UI", key: "ux" as QuickKey, count: activeJobs.filter((j) => /\bux\b|\bui\b/i.test(j.title)).length },
    { label: "Watchlist", href: "/watchlist", count: watchedCompanies.length },
    { label: "Sign in", href: "/login", count: null },
    { label: "All roles", key: "all" as QuickKey, count: activeJobs.length },
    {
      label: showClosed ? "Hide closed" : "Maybe closed",
      onToggleClosed: true,
      count: initialJobs.filter((j) => j.status === "potentially_closed").length,
    },
  ];

  return (
    <div className="pb-16">
      {/* Oriental lacquer header — Charlie's Tea mood: ink + soft gold */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#2c2827] via-[#3f3530] to-[#2b2523] text-porcelain">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 20% 0%, rgba(229,191,85,0.22), transparent 50%), radial-gradient(ellipse at 90% 40%, rgba(201,168,90,0.12), transparent 45%), url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M14 26c12-3 18 5 22 12 3-9 12-16 22-12-6 10-5 22-2 32-12-4-22-3-30 5-3-10-8-20-12-37z' fill='none' stroke='%23e5bf55' stroke-width='1'/%3E%3C/svg%3E\")",
            backgroundSize: "auto, auto, 96px 96px",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 pt-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#e5bf55]/80">
                Design hunt
              </p>
              <h1 className="brand-mark truncate text-[2.6rem] leading-none text-porcelain sm:text-[3.25rem]">
                Feyzawa
              </h1>
            </div>
            <nav className="flex shrink-0 items-center gap-1 text-xs sm:text-sm">
              <Link
                href="/watchlist"
                className="focus-ring rounded-full px-2.5 py-1.5 text-porcelain/85 hover:bg-white/10"
              >
                Watch
              </Link>
              <Link
                href="/tracker"
                className="focus-ring rounded-full px-2.5 py-1.5 text-porcelain/85 hover:bg-white/10"
              >
                Tracker
              </Link>
              <Link
                href="/outreach"
                className="focus-ring rounded-full px-2.5 py-1.5 text-porcelain/85 hover:bg-white/10"
              >
                Outreach
              </Link>
              <Link
                href="/login"
                className="focus-ring rounded-full bg-porcelain/15 px-2.5 py-1.5 text-porcelain hover:bg-porcelain/25"
              >
                Sign in
              </Link>
            </nav>
          </div>

          <form
            onSubmit={runSearch}
            className="mt-4 flex items-center gap-2 rounded-full bg-porcelain p-1 pl-4 shadow-soft"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Title, company, location…"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-ink-soft/50"
              aria-label="Search roles"
            />
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="hidden max-w-[9rem] truncate rounded-full bg-foam px-2 py-1.5 text-xs text-ink sm:block"
              aria-label="Company"
            >
              <option value="">Company</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="focus-ring shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-medium text-porcelain"
            >
              Search
            </button>
          </form>

          <div className="mt-5 grid grid-cols-4 gap-2 pb-8 sm:gap-3">
            {shortcuts.map((item) =>
              "href" in item && item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className="focus-ring flex flex-col items-center gap-1.5 rounded-2xl bg-white/10 px-1 py-3 text-center backdrop-blur-sm transition hover:bg-white/18"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-porcelain/15 text-sm font-semibold">
                    {item.sub}
                  </span>
                  <span className="text-[11px] font-medium leading-tight sm:text-xs">
                    {item.label}
                  </span>
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  onClick={"onClick" in item ? item.onClick : undefined}
                  className="focus-ring flex flex-col items-center gap-1.5 rounded-2xl bg-white/10 px-1 py-3 text-center backdrop-blur-sm transition hover:bg-white/18"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-porcelain/15 text-sm font-semibold">
                    {item.sub}
                  </span>
                  <span className="text-[11px] font-medium leading-tight sm:text-xs">
                    {item.label}
                  </span>
                </button>
              ),
            )}
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-5 max-w-6xl px-3 sm:px-6">
        {/* Shortcut + category card */}
        <section className="animate-pour tea-surface overflow-hidden rounded-[1.35rem] shadow-panel">
          <div className="flex gap-1 overflow-x-auto border-b border-[var(--line)] px-3 pt-3 scrollbar-thin">
            {CATEGORY_CHIPS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => applyQuick(c.key)}
                className={`focus-ring shrink-0 border-b-2 px-3 pb-2.5 text-sm transition ${
                  chip === c.key
                    ? "border-gold font-semibold text-ink"
                    : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2 p-3 sm:gap-3 sm:p-4">
            {gridTiles.map((tile) => {
              if ("href" in tile && tile.href) {
                return (
                  <Link
                    key={tile.label}
                    href={tile.href}
                    className="focus-ring flex flex-col items-center gap-1 rounded-xl bg-foam/80 px-1 py-3 text-center transition hover:bg-ceramic"
                  >
                    <span className="text-base font-semibold text-ink sm:text-lg">
                      {tile.count ?? "→"}
                    </span>
                    <span className="text-[10px] leading-tight text-ink-soft sm:text-[11px]">
                      {tile.label}
                    </span>
                  </Link>
                );
              }
              if ("onToggleClosed" in tile && tile.onToggleClosed) {
                return (
                  <button
                    key={tile.label}
                    type="button"
                    onClick={() => setShowClosed((v) => !v)}
                    className={`focus-ring flex flex-col items-center gap-1 rounded-xl px-1 py-3 text-center transition ${
                      showClosed ? "bg-jade text-porcelain" : "bg-foam/80 hover:bg-ceramic"
                    }`}
                  >
                    <span className="text-base font-semibold sm:text-lg">
                      {tile.count}
                    </span>
                    <span className="text-[10px] leading-tight sm:text-[11px]">
                      {tile.label}
                    </span>
                  </button>
                );
              }
              return (
                <button
                  key={tile.label}
                  type="button"
                  onClick={() =>
                    applyQuick((tile as { key: QuickKey }).key)
                  }
                  className={`focus-ring flex flex-col items-center gap-1 rounded-xl px-1 py-3 text-center transition ${
                    chip === (tile as { key: QuickKey }).key
                      ? "bg-jade text-porcelain"
                      : "bg-foam/80 hover:bg-ceramic"
                  }`}
                >
                  <span className="text-base font-semibold sm:text-lg">
                    {tile.count}
                  </span>
                  <span className="text-[10px] leading-tight sm:text-[11px]">
                    {tile.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Status strip */}
        <div className="animate-pour stagger-1 mt-3 flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-porcelain/90 px-3 py-2.5 text-sm text-ink-soft shadow-soft">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-matcha/15 text-xs text-gold">
            ●
          </span>
          <p className="min-w-0 flex-1 truncate">
            <span className="font-semibold text-ink">{filtered.length}</span> roles
            {pending ? " · steeping…" : ""}
            {updatedAt
              ? ` · verified ${relativeTime(updatedAt)} · ${source}`
              : " · run refresh for live ATS"}
          </p>
          {(q || chip !== "all" || company || showClosed) && (
            <button
              type="button"
              onClick={() => {
                startTransition(() => {
                  setQ("");
                  setChip("all");
                  setCompany("");
                  setShowClosed(false);
                });
              }}
              className="focus-ring shrink-0 text-xs text-gold underline-offset-2 hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        {/* Featured / open roles */}
        <section id="open-roles" className="animate-pour stagger-2 mt-5 scroll-mt-4">
          <div className="mb-2 flex items-baseline justify-between gap-2 px-0.5">
            <h2 className="brand-display text-2xl text-ink sm:text-3xl">
              Open roles
            </h2>
            <span className="text-xs text-ink-soft">
              {filtered.length} matching
            </span>
          </div>

          <ul className="tea-surface divide-y divide-[var(--line)] overflow-hidden rounded-[1.25rem]">
            {featured.length === 0 ? (
              <li className="px-4 py-12 text-center text-sm text-ink-soft">
                No matching roles — reset filters or refresh allowlist boards.
              </li>
            ) : (
              featured.map((job) => (
                <li key={job.id} className="job-row">
                  <div className="flex flex-col gap-2.5 px-3.5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="focus-ring truncate text-[15px] font-medium text-ink hover:text-gold"
                        >
                          {job.title}
                        </Link>
                        <StatusBadge value={job.status} />
                      </div>
                      <p className="truncate text-xs text-ink-soft sm:text-sm">
                        {job.companyName}
                        {job.locationText ? ` · ${job.locationText}` : ""}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <EligibilityBadge value={job.eligibility} />
                        <ExperienceBadge value={job.experienceBand} />
                        <WorkStyleBadge value={job.workStyle} />
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="focus-ring rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-ink-soft"
                      >
                        Details
                      </Link>
                      <Link
                        href={`/jobs/${job.id}`}
                        className="focus-ring rounded-full border border-gold/40 bg-chartreuse/15 px-3 py-1.5 text-xs text-ink"
                      >
                        Applied?
                      </Link>
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="focus-ring rounded-full bg-jade px-3 py-1.5 text-xs font-medium text-porcelain"
                      >
                        Apply
                      </a>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>

          {filtered.length > featured.length ? (
            <p className="mt-2 text-center text-xs text-ink-soft">
              Showing top {featured.length} of {filtered.length} — scroll for
              full board
            </p>
          ) : null}
        </section>

        {/* Company watch */}
        <section className="animate-pour stagger-3 mt-6">
          <div className="mb-2 flex items-baseline justify-between px-0.5">
            <h2 className="brand-display text-2xl text-ink">Company watch</h2>
            <Link href="/watchlist" className="text-xs text-gold hover:underline">
              Manage →
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {watchedCompanies.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  startTransition(() => {
                    setCompany(name);
                    setChip("all");
                  });
                  document
                    .getElementById("open-roles")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`focus-ring shrink-0 rounded-2xl border px-3.5 py-2.5 text-left transition ${
                  company === name
                    ? "border-jade bg-jade text-porcelain"
                    : "border-[var(--line)] bg-porcelain hover:border-gold/50"
                }`}
              >
                <p className="text-sm font-medium">{name}</p>
                <p
                  className={`text-[11px] ${company === name ? "text-porcelain/80" : "text-ink-soft"}`}
                >
                  {companyCounts.get(name) ?? 0} open
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Tracker entry */}
        <Link
          href="/tracker"
          className="focus-ring mt-5 flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-gradient-to-r from-foam to-porcelain px-4 py-3.5 shadow-soft transition hover:border-gold/45"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-jade text-sm font-semibold text-porcelain">
            T
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">
              Application tracker
            </span>
            <span className="block text-xs text-ink-soft">
              Saved · Applied · Interviewing · Offer · Rejected — private notes
            </span>
          </span>
          <span className="text-gold">→</span>
        </Link>

        {/* Full board remainder */}
        <section id="board" className="mt-8 scroll-mt-4">
          <div className="mb-2 flex items-baseline justify-between px-0.5">
            <h2 className="brand-display text-2xl text-ink sm:text-3xl">
              Full board
            </h2>
            <span className="text-xs text-ink-soft">
              {filtered.length} roles
            </span>
          </div>
          <ul className="tea-surface divide-y divide-[var(--line)] overflow-hidden rounded-[1.25rem]">
            {filtered.map((job) => (
              <li key={`full-${job.id}`} className="job-row">
                <div className="flex flex-col gap-2 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                  <div className="min-w-0">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="focus-ring text-sm font-medium text-ink hover:text-gold"
                    >
                      {job.title}
                    </Link>
                    <p className="truncate text-xs text-ink-soft">
                      {job.companyName}
                      {job.locationText ? ` · ${job.locationText}` : ""}
                      {" · "}
                      verified {relativeTime(job.lastVerifiedAt)}
                    </p>
                  </div>
                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-porcelain"
                  >
                    Apply
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
